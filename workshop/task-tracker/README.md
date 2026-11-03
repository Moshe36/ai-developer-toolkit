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
```

Creates, per track:

- `<Root>\task-tracker-<track>`: git repo, one commit, tag `ex-start`. No `node_modules`, `target` or `dist` in git.
- `<Root>\.checks-<track>`: hidden checks and `verify.ps1`.

The script warms dependencies (`npm install` / `mvn -q -DskipTests compile`) so the first verify is not slow.
Allow a few minutes on first run (Maven downloads); later runs are fast. It sets a local git identity ("Workshop")
only if none is configured globally.

> **Warning: the checks must stay outside the participant repo.** Never copy `.checks-<track>` into
> `task-tracker-<track>`; the agent under test would see them.

## Verify and reset

```powershell
& <Root>\.checks-<track>\verify.ps1 -Repo <Root>\task-tracker-<track>
cd <Root>\task-tracker-<track>; git checkout -f ex-start; git clean -fd
```

## Baselines

| Track    | Starting app | `backend` / `frontend` overlay | `backend-partial` / `frontend-server-only` overlay |
|----------|--------------|--------------------------------|----------------------------------------------------|
| Backend  | 5 / 10       | 10 / 10                        | 10 / 10                                            |
| Frontend | 2 / 7        | 7 / 7                          | 7 / 7                                              |

"Existing tests: PASS" in all cases.

## Applying a solution (rehearsal / checks calibration)

```powershell
.\solution\apply.ps1 -Overlay backend -Repo <Root>\task-tracker-backend
```

Overlays: `backend`, `backend-partial`, `frontend`, `frontend-server-only`. Reset afterwards with the command above.

## Troubleshooting

- Maven PKIX / SSL errors against Maven Central on enterprise networks:
  `$env:MAVEN_OPTS = '-Djavax.net.ssl.trustStoreType=Windows-ROOT'`
- `git clean -fd` keeps ignored folders (`target`, `node_modules`), so resets stay fast.
