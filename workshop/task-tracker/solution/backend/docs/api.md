# Task Tracker API

Base URL: `http://localhost:8080`. All bodies are JSON.

## Members

- `GET /members` -> `[{ "id", "name", "assignedTaskCount", "openTaskCount", "openTaskLimit" }]`. `assignedTaskCount` counts tasks of **all** statuses; `openTaskCount` counts `TODO` and `IN_PROGRESS` tasks; `openTaskLimit` is the per-member cap (`tasks.max-open-per-member`, default 5).
- `POST /members` `{ "name" }` -> `201` member.

## Tasks

`TaskResponse`: `{ "id", "title", "status": "TODO|IN_PROGRESS|DONE", "assigneeId": number|null, "createdAt" }`

- `GET /tasks?status&assigneeId&sort=createdAt|title&page=0&size=20` -> `{ "items": [TaskResponse], "total": number }`. Sorted ascending; `size` max 100.
- `POST /tasks` `{ "title", "assigneeId"? }` -> `201 TaskResponse`. New tasks are `TODO`.
- `PATCH /tasks/{id}` with any of `title`, `status`, `assigneeId` -> `200 TaskResponse`. An absent key leaves the field unchanged; `"assigneeId": null` unassigns. Changing `status` from `DONE` back to `TODO`/`IN_PROGRESS` reopens the task.
- `POST /tasks/bulk-assign` `{ "taskIds": [..], "assigneeId" }` -> `200 [TaskResponse]`.

## Errors

Every error uses the envelope `{ "code": string, "message": string, "field": string|null }`.

| Status | code | When |
|---|---|---|
| 404 | `TASK_NOT_FOUND` | Unknown task id |
| 404 | `MEMBER_NOT_FOUND` | Unknown assignee id |
| 400 | `VALIDATION_FAILED` | Blank title, bad status/sort/page/size, malformed body; `field` names the offender |
| 409 | `MEMBER_TASK_LIMIT_REACHED` | Assigning, creating, bulk-assigning or reopening a task would give a member more open tasks than the limit; `field` is `assigneeId` |
