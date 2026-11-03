# Workshop Exercise — "Workload Limit"

> Status: **DRAFT for review.** Not rehearsed. Decisions marked *(proposal)* are the assistant's calls and still need your approval.

---

## 1. What this exercise is for

Participants implement **the same small user story four times**, once per workflow, and compare the results using objective evidence.

| Trial | Workflow | What the participant does |
|---|---|---|
| A | Native | Run 1: raw one-line prompt. Reset. Run 2: specific prompt they write themselves. |
| B | Lean stack-aware (grill-me + stack skills) | Same brief, reset code |
| C | Superpowers | Same brief, reset code |
| D | Agentcraft | Same brief, reset code |

**The lesson is not "more process wins."** The lesson is:

> For this task, what did each workflow help me notice or prevent, and what did it cost?

### Why this story

The story looks like a 10-line change. Underneath, it contains:

- **Product decisions** that a clarifying or planning workflow should bring up
- **Multiple code paths** that must all enforce the rule, including one that isn't obviously about "assignment"
- **Existing behavior** that must not break
- **Scope bait**, meaning messy nearby code that tempts the agent to refactor
- **Deterministic verification**: no clocks, timezones, or randomness

---

## 2. Tracks

Each participant picks **one track** for all four trials:

| Track | Who | Stack |
|---|---|---|
| Backend | Java / Spring Boot developers | Spring Boot 3.x, Java 21, JUnit 5 |
| Frontend | React developers | React + TypeScript, Vitest, Testing Library, MSW mock API |

**Optional full-stack variant**: the final adoption block or a stretch task. See section 10.

---

## 3. The starting app — "Team Task Tracker"

Everything in this section **already exists** at git tag `ex-start`.

### 3.1 Domain

```
Member { id, name }
Task   { id, title, status: TODO | IN_PROGRESS | DONE, assigneeId?: string, createdAt }
```

### 3.2 The four ways a task gets an assignee (the core of the exercise)

| # | Path | Where it lives | Why it's a trap |
|---|---|---|---|
| 1 | Create a task with an assignee | `POST /tasks` | Obvious |
| 2 | Change a task's assignee | `PATCH /tasks/{id}` | Obvious |
| 3 | Bulk assign selected tasks | `POST /tasks/bulk-assign` | Easy to forget; must be all-or-nothing |
| 4 | **Reopen a DONE task** | `PATCH /tasks/{id}` with `status` | **Not about assignment at all.** Reopening increases the member's open count. Only exploring the code or planning catches this. |

### 3.3 Backend (existing)

```
GET    /members                      -> [{ id, name, assignedTaskCount }]
GET    /tasks?status=&assigneeId=&sort=&page=&size=
POST   /tasks                        { title, assigneeId? }
PATCH  /tasks/{id}                   { title?, status?, assigneeId? }   // assigneeId: null = unassign
POST   /tasks/bulk-assign            { taskIds: [], assigneeId }
```

- Layers: `TaskController` → `TaskService` / `AssignmentService` → repository (H2 or in-memory)
- **Existing error envelope**, already used for 400 and 404 errors:
  ```json
  { "code": "TASK_NOT_FOUND", "message": "Task 42 not found", "field": null }
  ```
- `@ControllerAdvice` maps domain exceptions to that envelope
- **Existing test suite passes** (CRUD, filters, sort, paging, bulk assign)
- **Scope bait**: `AssignmentService` is long, has duplicated validation, and an odd method name. It works correctly.

### 3.4 Frontend (existing)

- **Task table**: filters (status, assignee), sort, bulk select checkbox, "Assign to…" bulk action
- **Edit drawer**: title, status select (including reopening DONE), assignee dropdown
- **Members sidebar**: name plus `assignedTaskCount`
- **Mock API (MSW)** implementing exactly the backend contract, including the error envelope
- **Existing test suite passes**
- **Scope bait**: `TaskTable.tsx` is about 400 lines with inline handlers. It works correctly.

---

## 4. The brief (identical in every trial)

> **Add a team rule: a member can have at most 5 open tasks assigned.**

Trial A run 1 uses only this sentence. In Trial A run 2, the participant writes their own specific prompt. Trials B–D start from this sentence and the workflow takes over.

### Contract hints given to everyone *(proposal)*

To keep the hidden tests fair without giving away the design:

- **Backend track:** "Rejections must use the existing error envelope with HTTP 409 and code `MEMBER_TASK_LIMIT_REACHED`."
- **Frontend track:** API documentation describing the backend after the change (see 5.2). It's framed as "the backend team already shipped this."

---

## 5. Product-owner card

Participants **may only answer agent questions from this card**, or by asking a facilitator acting as the product owner. They **must not volunteer** answers the agent didn't ask for. The card is not pasted into the prompt.

### 5.1 Product rules

| # | Question | Answer |
|---|---|---|
| R1 | What counts as "open"? | `TODO` and `IN_PROGRESS`. `DONE` doesn't count. |
| R2 | Is the limit fixed? | Configurable. Default 5. |
| R3 | Reassign a task to the member who already has it? | Allowed. No-op. |
| R4 | Members already over the limit today? | Don't touch existing assignments. Block only **new** ones. Other edits to their tasks still work. |
| R5 | Reopen a DONE task whose assignee is at the limit? | **Blocked** with the same error. |
| R6 | Move `TODO` → `IN_PROGRESS` at the limit? | Allowed. The count doesn't change. |
| R7 | Bulk assign that would exceed the limit? | **All-or-nothing.** Nothing changes. |
| R8 | Bulk includes tasks already assigned to that member? | Don't count them twice. |
| R9 | Unassigning? | Always allowed. |
| R10 | What does the user see? | A message naming the member and the limit, e.g. "Dana already has 5 open tasks (limit 5)." |
| R11 | Should we clean up related code? | Out of scope. Don't refactor unrelated code. |

### 5.2 API after the change (frontend track gets this as documentation)

```
GET /members -> [{ id, name, assignedTaskCount, openTaskCount, openTaskLimit }]

409 response on any rejected assignment / reopen / bulk-assign:
{ "code": "MEMBER_TASK_LIMIT_REACHED",
  "message": "Dana already has 5 open tasks (limit 5).",
  "field": "assigneeId" }
```

---

## 6. Hidden acceptance tests

Participants run one command (`./verify` / `npm run verify`) and see **only a score**, e.g.
`Hidden checks: 7 / 11 passed · Existing tests: PASS`.
Test names are neutral (`check_01`…). The real names and trap descriptions are revealed in the comparison block.

### 6.1 Backend: 11 hidden checks

Setup for each check: member **Dana** with exactly 5 open tasks unless stated otherwise. Limit = 5.

| ID | Rule | Scenario | Expected |
|---|---|---|---|
| B01 | path 1 | Create task assigned to Dana | 409 + `MEMBER_TASK_LIMIT_REACHED`, task not created |
| B02 | path 2 | Reassign another member's task to Dana | 409, assignee unchanged |
| B03 | R7 path 3 | Bulk-assign 2 unassigned tasks to Dana (has 4) | 409, **neither** task assigned |
| B04 | R8 | Dana has 4; bulk-assign [one of Dana's tasks, one new task] | 200 (count becomes 5) |
| B05 | R5 path 4 | Reopen Dana's DONE task (DONE → TODO) | 409, status still DONE |
| B06 | R1 | Dana has 5 open + 3 DONE; assign to member with 4 open + 10 DONE | 200 (DONE ignored) |
| B07 | R3 | `PATCH` one of Dana's tasks with `assigneeId = Dana` | 200 |
| B08 | R4 | Dana has 7 open (seeded over limit); edit title of her task | 200 |
| B09 | R6 | Move Dana's task TODO → IN_PROGRESS | 200 |
| B10 | R2 | Run with `tasks.max-open-per-member=2`; Dana has 2 → assign | 409 |
| B11 | R10 | Any 409 above | Envelope shape `{code,message,field}` and message contains member name and limit |

Plus: **the entire existing test suite must still pass** (reported separately).

Example (JUnit 5, sketch):

```java
@Test
void check_05() { // real name: reopeningDoneTaskIsBlockedWhenAssigneeAtLimit
    var dana = seed.memberWithOpenTasks("Dana", 5);
    var doneTask = seed.doneTaskAssignedTo(dana);

    var response = client.patch("/tasks/" + doneTask.id(), Map.of("status", "TODO"));

    assertThat(response.status()).isEqualTo(409);
    assertThat(response.json("code")).isEqualTo("MEMBER_TASK_LIMIT_REACHED");
    assertThat(repository.find(doneTask.id()).status()).isEqualTo(DONE);
}
```

### 6.2 Frontend: 9 hidden checks

The mock API is seeded with Dana (5/5), Avi (3/5), and Noa (7/5, over the limit).

| ID | Rule | Scenario | Expected |
|---|---|---|---|
| F01 | display | Members sidebar | Shows open count vs limit, e.g. "Dana 5/5" |
| F02 | R1 | Dana has DONE tasks | Not included in the shown count |
| F03 | limit UX | Assignee dropdown on Avi's task | Dana is **visible but disabled**, with an accessible reason (not hidden) |
| F04 | R3 | Edit drawer for one of Dana's tasks | Dana remains the selected, valid assignee; saving other fields works |
| F05 | R7/R8 | Select 2 unassigned tasks, bulk assign to Avi (3/5) | Allowed (→ 5/5) |
| F06 | R7 | Select 3 unassigned tasks, bulk assign to Avi | Blocked or explained before sending, **or** server 409 handled per F08 |
| F07 | R5 | Reopen Dana's DONE task | Blocked with a message |
| F08 | server rejection | Mock forces 409 on a save the UI thought valid | Error message from the server is shown; UI **does not show the change as saved**; data matches the server after the error |
| F09 | refresh | Assign a task to Avi successfully | Avi's count updates without a page reload |

Plus: **the existing test suite passes** (sort, filters, bulk select).

Example (Vitest + Testing Library, sketch):

```tsx
test('check_03', async () => { // real name: memberAtLimitIsDisabledWithReason
  renderApp();
  await openEditDrawerFor('Fix login bug'); // assigned to Avi

  const dana = await screen.findByRole('option', { name: /Dana/ });
  expect(dana).toBeDisabled();
  expect(dana).toHaveAccessibleDescription(/limit/i);
});
```

> Note: frontend hidden tests depend on accessible names and roles. **The guided path's starter hints must mention "use accessible labels."** Otherwise F03 tests our selectors, not their workflow. Rehearsal will tell us whether this is fair.

### 6.3 Measured from the diff (not tests)

| Metric | How |
|---|---|
| Files changed outside the expected set | `git diff --stat` vs an allow-list |
| Scope bait touched? | Did `AssignmentService` / `TaskTable.tsx` get refactored beyond the needed change? |
| Lines added/removed | `git diff --shortstat` |

---

## 7. What each participant records per trial

One row per trial in the shared room sheet:

| Field | Source |
|---|---|
| Hidden checks passed (x / 11 or x / 9) | `verify` output |
| Existing tests pass? | `verify` output |
| Wall-clock minutes | Start/stop |
| Minutes spent reading plans/handoffs | Self-timed estimate |
| Steering interventions (corrections, "no, do X") | Tally |
| Out-of-scope changes? | Diff script |
| **"Did I add information the workflow didn't ask for?"** | Honest yes/no |

Why measure instead of asking how it felt: METR's 2025 trial found developers believed AI made them about 20% faster when it actually made them about 19% slower. Perceived benefit is unreliable.

---

## 8. Session flow

### Per trial (fits the existing 25–40 minute lab slots)

1. `git checkout -f ex-start && git clean -fd` (reset)
2. Switch active workflow (mechanism still to be decided)
3. Start a **fresh** agent session, give the brief
4. Answer questions only from the product-owner card
5. Stop at the time box, even if unfinished. Unfinished is data.
6. Run `verify`, record the row
7. Short debrief: process only, no trap reveal

### Trial A specifics

- Run 1: brief only, no follow-ups (about 7 minutes)
- Reset
- Run 2: the participant writes a specific prompt without the product-owner card, using only their own thinking (about 8 minutes)
- This shows the gap between "I tried to be specific" and "a workflow asked me questions"

### Comparison block (14:00)

1. Reveal the trap list (sections 5 and 6 with real test names)
2. Show the room scoreboard: per workflow, median checks passed, time, interventions, scope violations
3. Each person fills in a short rubric for their four results: **correct / in scope / tested / readable** (1–3 each)
4. Discussion prompts:
   - Which trap did a workflow catch *before* coding? Which did only tests catch?
   - Who caught the **reopen** path, and how?
   - Where was the overhead not worth it?
   - Which workflow would you use for this size of task at work?

---

## 9. Support levels (same brief, same tests for all)

| Level | Gets |
|---|---|
| **Guided** | Pointers to the relevant files, the four assignment paths listed as "areas to check", "use accessible labels" (frontend), hints on request |
| **Independent** | Brief + product-owner card access only |
| **Stretch** | All of the above + one extra constraint, e.g. "also expose the limit in `GET /settings`", or inspect and improve one workflow handoff or skill afterward |

Participants choose their level. They can switch between trials. Record the level in the sheet.

> Caveat: guided hints reveal traps (e.g. the reopen path). Guided results aren't comparable with independent results. Compare **within** a level.

---

## 10. Full-stack variant (optional)

The same brief, with **no** contract hints. The agent changes both the backend and the frontend.
New traps that exist only at full-stack level:

- Both layers must agree on what "open" means
- The frontend must consume the error envelope the backend actually produces
- The members endpoint must expose `openTaskCount` / `openTaskLimit` (or equivalent) for the UI to work

Verified by running both hidden suites against the real backend instead of the mock. Best used in the final adoption block with the participant's chosen workflow.

---

## 11. Honest risks

| Risk | Impact | Mitigation |
|---|---|---|
| Learning carryover (later trials benefit from knowing the traps) | Inflates B–D results | Product-owner card discipline, honesty question, say it openly in the debrief |
| Heavy workflows (C/D) don't finish in 30 min | Low scores from time, not quality | Rehearse; trim bulk assign if needed; record "unfinished" explicitly |
| Single runs are noisy | One person's result means little | Compare room medians, not individuals |
| Frontend tests too tied to markup | Measures selectors, not workflow | Accessible-label hint; rehearse with real agents |
| Juniors can't evaluate the code | They only see a score | Trap reveal explains *why* each check matters |
| Building the starting app is significant prep | Facilitator time | Keep the app minimal: only what the four paths need |
| Workflow switching contaminates trials | Instructions from several workflows active at once | Decide and test a clean switching mechanism |

---

## 12. Still open

1. Approve or adjust the product-owner card answers (they define "correct")
2. Contract hints in the brief (section 4): keep or remove?
3. Workflow switching mechanism per harness
4. Exact time box per trial vs. the draft-04 schedule
5. Who builds the starting app and the hidden suites, and when we rehearse
6. Whether Trial A run 2 (participant-written specific prompt) fits in 25 minutes
