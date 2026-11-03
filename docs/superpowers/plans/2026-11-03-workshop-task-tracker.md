# Workshop Task Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "Team Task Tracker" starting apps (backend + frontend), their hidden checks, facilitator reference solutions, and a script that creates a participant workspace for the Workload Limit exercise.

**Architecture:** Everything lives under `workshop/task-tracker/` in this repo. `backend/` and `frontend/` are the **starting state** participants receive. `checks/` holds hidden checks and `verify` scripts that live **outside** the participant repo: verify copies checks in, runs them, prints only a score, then deletes them. `solution/` holds reference overlays that must score 100%. `new-workspace.ps1` creates a fresh participant git repo tagged `ex-start`, with checks in a sibling folder.

**Tech Stack:** Backend: Java 21 (`--release 21`), Spring Boot 3.5.x, Spring Data JPA, H2, JUnit 5, MockMvc, Maven. Frontend: React 18 + TypeScript, Vite 8, Vitest 5, Testing Library, MSW 3. Scripts: PowerShell 7.

**Spec:** `workshop/exercises/workload-limit.md` (v2)

## Global Constraints

- Limit is **5 open tasks**; open = `TODO` or `IN_PROGRESS`; `DONE` never counts.
- The starting state must **not** contain the limit rule in the backend, and the frontend must not *use* `openTaskCount`/limit errors.
- Hidden checks must never be in the participant repo or its git history.
- `verify` output is exactly: `Hidden checks: X / N passed · Existing tests: PASS|FAIL`. No check names.
- Hidden checks test invariants only (spec §6.1). Every check must pass with **both** all-or-nothing and partial bulk policies.
- Error envelope: `{ "code": string, "message": string, "field": string|null }`.
- Scope bait must work correctly. Messy, not buggy.
- Starting backend scores **5 / 10**: B05–B09 pass, B01–B04 and B10 fail. Starting frontend scores **2 / 7**: F06 and F07 pass. Reference solutions score 10/10 and 7/7. These baselines are acceptance tests for the whole build.
- Frontend uses native `<select>`, `<input>`, `<button>` with visible `<label>`s. Checks locate elements by role and label.

## Review Focus

1. **Agent discovers the checks.** The checks folder sits next to the repo, not inside it. `new-workspace.ps1` must put checks at `<root>\.checks-<track>` (dot-prefixed) and the repo at `<root>\task-tracker-<track>`. Test: after creating a workspace, `git -C <repo> ls-files` contains no `HiddenChecks`/`.check.` file.
2. **Verify leaves debris after a crash.** If tests fail to compile (participant broke the build), verify must still delete copied checks and report `Existing tests: FAIL`. Test in Task 2 / Task 5 with a deliberately broken source file.
3. **Partial-bulk solution flagged as wrong.** B03/F04 must pass for a partial policy. Test: a second backend solution variant (`solution/backend-partial/`) that assigns tasks until the limit and skips the rest must also score 10/10.
4. **Participant changed the PATCH contract or repository internals.** Checks seed data only through `MemberRepository`/`TaskRepository` `save`/`deleteAll` and call only the public HTTP API. No service classes are referenced.
5. **Frontend checks too tied to markup.** F02/F05 accept either "option disabled" or "an error with limit-related text shown after save". The reference solution implements disable. A second variant (`solution/frontend-server-only/`) that only shows server errors must also score 7/7.

---

## File Structure

```
workshop/task-tracker/
  README.md                                  facilitator guide: build, workspace creation, baselines
  new-workspace.ps1                          creates participant repo + sibling checks folder
  backend/                                   STARTING STATE (participant)
    pom.xml
    docs/api.md
    src/main/java/com/workshop/tasktracker/
      TaskTrackerApplication.java
      member/Member.java, MemberRepository.java, MemberController.java, MemberResponse.java
      task/Task.java, TaskStatus.java, TaskRepository.java, TaskController.java,
           TaskService.java, TaskPatch.java, TaskResponse.java, CreateTaskRequest.java,
           BulkAssignRequest.java
      assignment/AssignmentService.java      scope bait
      error/ErrorResponse.java, ApiExceptionHandler.java, NotFoundException.java
      seed/DemoDataSeeder.java
    src/main/resources/application.properties
    src/test/java/com/workshop/tasktracker/TaskApiTest.java, MemberApiTest.java
  frontend/                                  STARTING STATE (participant)
    package.json, vite.config.ts, tsconfig.json, index.html
    docs/api.md
    src/main.tsx, App.tsx, api.ts, types.ts
    src/components/TaskTable.tsx (scope bait), EditTaskDrawer.tsx, MembersSidebar.tsx
    src/mocks/db.ts, handlers.ts, browser.ts, server.ts
    src/test/setup.ts
    src/App.test.tsx
  checks/
    backend/HiddenChecks.java, verify.ps1
    frontend/hidden.check.tsx, vitest.checks.config.ts, verify.ps1
  solution/
    backend/       overlay files (reference: all-or-nothing bulk)
    backend-partial/  overlay variant (partial bulk)
    frontend/      overlay files (reference: disable at-limit members)
    frontend-server-only/  overlay variant
    apply.ps1      copies an overlay onto a workspace repo
```

---

### Task 1: Backend starting app

**Files:** everything under `workshop/task-tracker/backend/` above.

**Interfaces:**
- Produces (relied on by checks and solution):
  - `Member` JPA entity: `Long id`, `String name`. `MemberRepository extends JpaRepository<Member, Long>`.
  - `Task` JPA entity: `Long id`, `String title`, `TaskStatus status`, `Long assigneeId` (nullable), `Instant createdAt`. `TaskRepository extends JpaRepository<Task, Long>` with `List<Task> findByAssigneeId(Long)`.
  - `TaskStatus { TODO, IN_PROGRESS, DONE }`.
  - HTTP (JSON):
    - `GET /members` → `[{id, name, assignedTaskCount}]` (counts **all** statuses; this existing number is intentionally not "open").
    - `POST /members {name}` → 201 member.
    - `GET /tasks?status&assigneeId&sort=createdAt|title&page&size` → `{items:[TaskResponse], total}`.
    - `POST /tasks {title, assigneeId?}` → 201 `TaskResponse{id,title,status,assigneeId,createdAt}`; new tasks are `TODO`.
    - `PATCH /tasks/{id}` with any of `title`, `status`, `assigneeId`. An explicit `"assigneeId": null` unassigns; an absent key leaves it unchanged (`TaskPatch` reads a `JsonNode` and tracks presence).
    - `POST /tasks/bulk-assign {taskIds, assigneeId}` → 200 `[TaskResponse]`.
    - 404 for unknown task/member → `{code:"TASK_NOT_FOUND"|"MEMBER_NOT_FOUND", message, field:null}`; 400 validation → `{code:"VALIDATION_FAILED", message, field}`.
  - `AssignmentService` (scope bait): handles create-with-assignee, reassign, and bulk-assign. Contains duplicated member-existence checks in three methods and a method named `doAssignStuff`. Correct behavior. Reopen (status change) goes through `TaskService`, **not** `AssignmentService`.
  - `DemoDataSeeder` (`@Profile("!test")`): Dana 4 open + 2 DONE, Avi 3 open, Noa 2 open, 3 unassigned tasks. Tests run with profile `test`.

- [ ] **Step 1: Write existing tests** `TaskApiTest` (MockMvc, `@SpringBootTest`, `@AutoConfigureMockMvc`, `@ActiveProfiles("test")`, `deleteAll` in `@BeforeEach`):
  - `createsTaskAsTodo`: POST → 201, `status == "TODO"`.
  - `assignsOnCreate`: POST with assigneeId → `assigneeId` echoed.
  - `patchTitleKeepsAssignee`: PATCH `{title}` → assignee unchanged.
  - `patchNullAssigneeUnassigns`: PATCH `{"assigneeId":null}` → `assigneeId` null.
  - `reopensDoneTask`: PATCH status DONE then TODO → 200, `TODO`.
  - `bulkAssignsAll`: 3 tasks → all have the assignee.
  - `filtersByStatusAndSortsByTitle`: returns only matching, title-ascending.
  - `unknownTaskReturns404Envelope`: `code == "TASK_NOT_FOUND"`, `field` null.
  - `MemberApiTest.countsAllAssignedTasks`: member with 2 TODO + 1 DONE → `assignedTaskCount == 3`.
- [ ] **Step 2:** `mvn -q test` → FAIL (classes missing).
- [ ] **Step 3:** Implement the files listed. `pom.xml`: `spring-boot-starter-parent` 3.5.x, `maven.compiler.release=21`, starters web, data-jpa, validation, h2, test.
- [ ] **Step 4:** `mvn -q test` → all pass. `mvn spring-boot:run` → `GET /members` returns 3 seeded members.
- [ ] **Step 5:** Write `docs/api.md` documenting the current endpoints and error envelope (no limit content).
- [ ] **Step 6: Commit** `feat: Add workshop task-tracker backend starting app`

---

### Task 2: Backend hidden checks + verify

**Files:** `checks/backend/HiddenChecks.java`, `checks/backend/verify.ps1`

**Interfaces:**
- Consumes: Task 1 repositories, entities, HTTP API.
- Produces: `verify.ps1 -Repo <path>` printing the exact line from Global Constraints. Exit code 0 always (score is the result).

`HiddenChecks` lives in package `com.workshop.tasktracker.checks`. Methods are named `check_01`…`check_10` with a `// real name:` comment. Fixture helpers (private): `member(name)`, `openTasks(member, n)`, `doneTask(member)`, `unassignedTasks(n)`, all via repository `save`. `@BeforeEach` deletes all tasks and members. "Rejected" = HTTP 4xx.

- [ ] **Step 1: Write checks** (Dana has 5 open unless stated):
  - `check_01` create assigned to Dana → 4xx; `taskRepository.findByAssigneeId(dana)` open count still 5.
  - `check_02` Avi's task PATCH `assigneeId=dana` → 4xx; task still Avi's.
  - `check_03` Dana has 4 open; bulk-assign 2 unassigned → any status; afterward Dana's open count ≤ 5.
  - `check_04` Dana's DONE task PATCH `status=TODO` → 4xx; status still DONE.
  - `check_05` Dana 5 open + 3 DONE; PATCH one open → DONE (2xx); create task assigned to Dana → 2xx.
  - `check_06` PATCH Dana's task `assigneeId=dana` → 2xx.
  - `check_07` PATCH Dana's TODO → `IN_PROGRESS` → 2xx.
  - `check_08` Noa has 7 open; PATCH one title → 2xx; Noa still has 7 open.
  - `check_09` PATCH Dana's task `assigneeId=null` → 2xx.
  - `check_10` create assigned to Dana → 4xx **and** body has string `code`, string `message`, key `field`.
- [ ] **Step 2:** `verify.ps1`: copy `HiddenChecks.java` to `<Repo>\src\test\java\com\workshop\tasktracker\checks\`, run `mvn -q test -Dsurefire.failIfNoSpecifiedTests=false` in `<Repo>`, parse `target\surefire-reports\TEST-*.xml`: hidden = testcases in class `...checks.HiddenChecks` without failure/error; existing = PASS if all other testcases passed and the build compiled. Delete the copied file and its `target` class output in a `finally` block. A compile failure → `Hidden checks: 0 / 10 passed · Existing tests: FAIL`.
- [ ] **Step 3:** Run `verify.ps1 -Repo workshop\task-tracker\backend` → `Hidden checks: 5 / 10 passed · Existing tests: PASS`. Confirm `src\test\java\...\checks` no longer exists.
- [ ] **Step 4:** Add a syntax error to a copy of the backend, run verify → `0 / 10 … FAIL`, checks file removed.
- [ ] **Step 5: Commit** `feat: Add hidden backend checks and verify script`

---

### Task 3: Backend reference solutions

**Files:** `solution/backend/**`, `solution/backend-partial/**`, `solution/apply.ps1`

**Interfaces:**
- Consumes: Task 1 classes; Task 2 verify.
- Produces: `apply.ps1 -Overlay <dir> -Repo <path>` (copies files over, preserving relative paths).

Reference behavior: new `WorkloadPolicy` component with `void ensureCanTakeOpenTasks(Long memberId, int additionalOpenTasks)`, throwing `MemberTaskLimitException` → 409 `{code:"MEMBER_TASK_LIMIT_REACHED", message:"<name> already has <n> open tasks (limit <limit>).", field:"assigneeId"}`. Limit from `tasks.max-open-per-member` (default 5). Called from create, reassign (skipped when the assignee is unchanged), bulk (counts only tasks not already assigned to that member and not DONE), and reopen (DONE → open with an assignee). `GET /members` adds `openTaskCount` and `openTaskLimit`. Minimal change to `AssignmentService` (no refactor).
`backend-partial`: same, but bulk assigns in order until the limit and skips the rest (200 with the assigned subset).

- [ ] **Step 1:** Copy the starting backend to a temp dir, apply `solution/backend`, run verify → `10 / 10 · PASS`.
- [ ] **Step 2:** Same with `solution/backend-partial` → `10 / 10 · PASS`.
- [ ] **Step 3: Commit** `feat: Add backend reference solutions`

---

### Task 4: Frontend starting app

**Files:** everything under `workshop/task-tracker/frontend/` above.

**Interfaces:**
- Produces (relied on by checks and solution):
  - `src/mocks/db.ts`: `type Seed = { members: {id:number; name:string}[]; tasks: Task[] }`, `resetDb(seed?: Seed): void`, `defaultSeed: Seed`.
  - `src/mocks/handlers.ts`: MSW handlers implementing the **post-change backend** (`docs/api.md`): the limit rule (all-or-nothing bulk), 409 envelope `MEMBER_TASK_LIMIT_REACHED`, and `GET /members` with `assignedTaskCount`, `openTaskCount`, `openTaskLimit`.
  - `src/mocks/server.ts`: `export const server = setupServer(...handlers)`. `src/test/setup.ts` starts/resets it and calls `resetDb()` before each test.
  - UI (accessible names are the contract):
    - Sidebar `<aside aria-label="Members">`, item text `"<name> (<assignedTaskCount>)"`.
    - Table rows: checkbox labeled `Select <title>`, cells title/status/assignee name (or `Unassigned`), button `Edit <title>`.
    - Bulk bar: `<select>` labeled `Assign selected to`, button `Assign`.
    - Drawer `<dialog aria-label="Edit task">`: input `Title`, select `Status`, select `Assignee` (option text = member name, plus `Unassigned`), button `Save`, button `Cancel`. On save it calls PATCH and closes; non-2xx currently **closes the drawer and ignores the error** (the realistic bug the honest-UI checks catch).
    - After any successful mutation the app refetches `/tasks` and `/members`.
  - `TaskTable.tsx` (scope bait): ~400 lines, inline handlers, duplicated filter logic; works correctly.
  - Bulk assign currently updates rows **optimistically** without checking the response.
- [ ] **Step 1: Write existing tests** in `App.test.tsx`:
  - `listsTasksWithAssignees`, `filtersByStatus`, `sortsByTitle`, `editsTitle`, `bulkAssignsSelected` (to a member under the limit), `sidebarShowsAssignedCounts`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement. `npm create vite` (react-ts), add vitest, jsdom, @testing-library/react, user-event, jest-dom, msw. `npm run dev` uses the MSW browser worker.
- [ ] **Step 4:** `npm test` → pass; `npm run dev` shows the seeded tasks.
- [ ] **Step 5:** `docs/api.md`: post-change contract framed as "the backend team already shipped TASK-214 server-side."
- [ ] **Step 6: Commit** `feat: Add workshop task-tracker frontend starting app`

---

### Task 5: Frontend hidden checks + verify

**Files:** `checks/frontend/hidden.check.tsx`, `vitest.checks.config.ts`, `verify.ps1`

**Interfaces:**
- Consumes: Task 4 `resetDb`, `server`, accessible names.
- Produces: `verify.ps1 -Repo <path>` with the same output format, N = 7.

Seed for every check: Dana 5 open + 1 DONE, Avi 3 open, Noa 7 open, 3 unassigned.
"Limit message" = any visible text matching `/limit|too many|maximum|max/i`.

- [ ] **Step 1: Write checks:**
  - `check_01` sidebar Dana's entry shows `5` and not `6` as her count (DONE excluded); passes if some text inside the Dana item matches `/\b5\b/` and none matches `/\b6\b/`.
  - `check_02` edit Avi's task: if the Dana option is disabled → pass if a limit message is visible in the dialog or the option text; else select Dana, Save → limit message visible; in both cases the row still shows Avi.
  - `check_03` force the next PATCH to return 409 (`server.use`), edit the title, Save → the server message is visible; the row shows the old title.
  - `check_04` select 3 unassigned, assign to Avi (3 open) → afterward, the rows shown as Avi's in the table equal Avi's tasks in `db` (no false success).
  - `check_05` edit Dana's DONE task, set Status `TODO`, Save (or option disabled) → the row still shows `DONE`, and a limit message is visible or the option is disabled.
  - `check_06` edit the title of Dana's task → saved; the row shows the new title.
  - `check_07` assign an unassigned task to Avi via the drawer → Avi's sidebar count increases without remount.
- [ ] **Step 2:** `vitest.checks.config.ts` sets `root` to the participant repo (`process.env.REPO`), `include` to the copied check path, and the repo's setup file. `verify.ps1` copies to `<Repo>\src\__hidden__\`, runs `npx vitest run --config <checks>\vitest.checks.config.ts --reporter=json --outputFile=<temp>`, runs `npm test -- --run` for existing tests, prints the line, and deletes `__hidden__` in `finally`.
- [ ] **Step 3:** Run on the starting frontend → `Hidden checks: 2 / 7 passed · Existing tests: PASS` (check_06, check_07).
- [ ] **Step 4:** Broken-build run → `0 / 7 … FAIL`, folder removed.
- [ ] **Step 5: Commit** `feat: Add hidden frontend checks and verify script`

---

### Task 6: Frontend reference solutions

**Files:** `solution/frontend/**`, `solution/frontend-server-only/**`

Reference: sidebar shows `"<name> (<openTaskCount>/<openTaskLimit> open)"`; members at the limit are disabled in both selects with option text `"<name> — at limit"`; the drawer shows server errors in `role="alert"` and stays open; bulk assign waits for the response and refetches; reopen at limit is rejected by the server and the error shown.
`frontend-server-only`: no disabling; relies on server errors only.

- [ ] **Step 1:** Temp copy + `solution/frontend` → `7 / 7 · PASS`.
- [ ] **Step 2:** Temp copy + `solution/frontend-server-only` → `7 / 7 · PASS`.
- [ ] **Step 3: Commit** `feat: Add frontend reference solutions`

---

### Task 7: Participant workspace script + facilitator README

**Files:** `new-workspace.ps1`, `README.md`; modify `workshop/exercises/workload-limit.md` (link to README in §12).

**Interfaces:**
- `new-workspace.ps1 -Track backend|frontend -Root <dir>` → creates `<Root>\task-tracker-<track>` (copy of the starting app, `git init`, one commit, tag `ex-start`, `npm install` for frontend) and `<Root>\.checks-<track>` (checks + verify). Prints the reset and verify commands.

- [ ] **Step 1:** Run for both tracks into a temp root. Assert: `git ls-files` contains no check files; `git tag` lists `ex-start`; `& <Root>\.checks-backend\verify.ps1 -Repo <Root>\task-tracker-backend` prints `5 / 10`; frontend prints `2 / 7`.
- [ ] **Step 2:** Reset drill: modify a file, run `git checkout -f ex-start; git clean -fd`, verify the baseline again.
- [ ] **Step 3:** README covers prerequisites (JDK 21+, Maven, Node 20+), workspace creation, baselines table, applying solutions, and the "checks must stay outside the repo" warning.
- [ ] **Step 4: Commit** `docs: Add task-tracker facilitator guide and workspace script`
