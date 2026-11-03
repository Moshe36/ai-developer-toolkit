# Task Tracker - Facilitator Guide

Starting apps, hidden checks, and reference solutions for the "Workload Limit" exercise
([spec](../exercises/workload-limit.md)).

## Prerequisites

- PowerShell 7, Git
- Backend track: JDK 21+ (built with Spring Boot 3.5.12; tested on JDK 25) and Maven
- Frontend track: Node 20+ (Vite 8, Vitest 5, MSW 3)

## Create a participant workspace

```powershell
.\new-workspace.ps1 -Track backend  -Root C:\workshop
.\new-workspace.ps1 -Track frontend -Root C:\workshop
# optional: -ChecksRoot D:\facilitator-checks   (default: %LOCALAPPDATA%\task-tracker-checks)
```

Creates, per track:

- `<Root>\task-tracker-<track>`: git repo, one commit, tag `ex-start`. No `node_modules`, `target` or `dist` in git.
- `<ChecksRoot>\<track>`: hidden checks and `verify.ps1`, never under `<Root>`. The script prints the exact verify command.

The script warms dependencies (`npm install` / `mvn -q -DskipTests compile`) so the first verify is not slow.
Allow a few minutes on first run (Maven downloads); later runs are fast. It sets a local git identity ("Workshop")
only if none is configured globally.

> **Warning: the checks must stay outside the participant repo.** Never copy the checks folder into
> `task-tracker-<track>`; the agent under test would see them. `checks\REVEAL.md` is the debrief sheet
> (check names, decisions, what each verifies); it is facilitator-only and is not copied by `new-workspace.ps1`.

If workspace creation fails midway, delete `<Root>\task-tracker-<track>` and `<ChecksRoot>\<track>`, then rerun.

## Verify and reset

```powershell
& <ChecksRoot>\<track>\verify.ps1 -Repo <Root>\task-tracker-<track>
cd <Root>\task-tracker-<track>; git checkout -f ex-start; git clean -fd
```

## Distributing to participants

- Participants receive ONLY the workspace repo folder (zip or clone of `task-tracker-<track>`), never this toolkit repo:
  it contains the solutions and the checks.
- The facilitator prepares laptops, or runs verify on participants' machines with the checks folder installed outside
  the repo.
- Run verify only after an attempt ends. The frontend verify briefly creates `src/__hidden__` inside the repo.

## Check touchpoints

The checks compile against / rely on these. If one changes, the result is `could not run`, which is a contract break,
not a failed attempt.

- Backend: `Member(String)`, `Task(String, TaskStatus, Long)`, their getters (`getId`, `getStatus`, `getAssigneeId`),
  `MemberRepository` / `TaskRepository` `save`, `deleteAll`, `findById`, `findByAssigneeId`, endpoints `/tasks`,
  `/tasks/{id}`, `/tasks/bulk-assign`.
- Frontend: `App` named export from `src/App`; `src/mocks/db` `getDb` / `resetDb`; `src/mocks/server` `server`;
  accessible names (`Edit <title>`, dialog `Edit task`, labels `Title` / `Assignee` / `Status`, `Select <title>`,
  `Assign selected to`, button `Assign`, `Save`, `Members` sidebar).

Notes:

- `Existing tests: FAIL` also appears if the agent deleted all tests, or if the participant's own code does not compile.
- If `src/test/setup.ts` is missing the frontend checks start/stop the MSW server themselves.
- Rehearsal must run `npm run dev` once in a real browser: the MSW service worker is not covered by any automated test.

## Baselines

| Track    | Starting app | `backend` / `frontend` overlay | `backend-partial` / `frontend-server-only` overlay |
|----------|--------------|--------------------------------|----------------------------------------------------|
| Backend  | 5 / 10       | 10 / 10                        | 10 / 10                                            |
| Frontend | 2 / 7        | 7 / 7                          | 7 / 7                                              |

"Existing tests: PASS" in all cases.

## Applying a solution (rehearsal / checks calibration)

```powershell
.\solution\apply.ps1 -Overlay .\solution\backend -Repo <Root>\task-tracker-backend
```

Overlays (pass as `.\solution\<name>`; a bare name resolves against the current directory and copies the starting app): `backend`, `backend-partial`, `frontend`, `frontend-server-only`. Reset afterwards with the command above.

## Troubleshooting

- Maven PKIX / SSL errors against Maven Central on enterprise networks:
  `$env:MAVEN_OPTS = '-Djavax.net.ssl.trustStoreType=Windows-ROOT'`
- `git clean -fd` keeps ignored folders (`target`, `node_modules`), so resets stay fast.
