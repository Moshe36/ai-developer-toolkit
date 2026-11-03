# Task Tracker API (frontend view)

The backend team has **already shipped TASK-214 server-side**: a member may have at most 5 open tasks (open = `TODO` or `IN_PROGRESS`). The MSW mock in `src/mocks/` mirrors this; the UI does not use it yet.

Base URL: `http://localhost:8080`. All bodies are JSON.

- `GET /members` -> `[{ id, name, assignedTaskCount, openTaskCount, openTaskLimit }]`. `assignedTaskCount` counts tasks of all statuses.
- `GET /tasks?status&assigneeId&sort=createdAt|title&page=0&size=20` -> `{ items: [Task], total }`.
- `POST /tasks` `{ title, assigneeId? }` -> `201 Task`.
- `PATCH /tasks/{id}` any of `title`, `status`, `assigneeId` -> `200 Task`. `DONE` -> `TODO`/`IN_PROGRESS` reopens.
- `POST /tasks/bulk-assign` `{ taskIds, assigneeId }` -> `200 [Task]`. All-or-nothing; tasks already assigned to that member and `DONE` tasks add no load.

`Task`: `{ id, title, status: "TODO|IN_PROGRESS|DONE", assigneeId: number|null, createdAt }`

## Errors

Envelope: `{ code, message, field }`.

| Status | code | When |
|---|---|---|
| 404 | `TASK_NOT_FOUND` / `MEMBER_NOT_FOUND` | Unknown id |
| 400 | `VALIDATION_FAILED` | Blank title etc. |
| 409 | `MEMBER_TASK_LIMIT_REACHED` | Create, reassign, bulk-assign or reopen would exceed the limit; `field` is `assigneeId`. Example message: `Dana already has 5 open tasks (limit 5).` |
