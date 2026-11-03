# Hidden Checks - Reveal Sheet (FACILITATOR ONLY)

Debrief material. Never give this file to participants; `new-workspace.ps1` does not copy it.
Decision IDs refer to [the spec](../../exercises/workload-limit.md).

## Backend (`HiddenChecksTest`)

| Check | Real name | Decision | Verifies |
|---|---|---|---|
| check_01 | Creating a task for a member at the limit is rejected | D2 | POST /tasks for Dana (5 open) returns 4xx; Dana still has 5 open |
| check_02 | Reassigning a task to a member at the limit is rejected | D2 | PATCH assigneeId=Dana on Avi's task returns 4xx; task stays Avi's |
| check_03 | Bulk assign never pushes a member over the limit | D2, D6 | Dana (4 open) + 2 unassigned: afterwards Dana has <= 5 open (all-or-nothing or partial both pass) |
| check_04 | Reopening a done task for a member at the limit is rejected | D2 | PATCH status=TODO on Dana's DONE task returns 4xx; stays DONE |
| check_05 | Done tasks do not count toward the limit | D1 | Dana 5 open + 3 DONE: completing one and then creating a new one both succeed |
| check_06 | Re-assigning a task to its current assignee is allowed | D4 | PATCH assigneeId=Dana on Dana's own task is 2xx |
| check_07 | Moving TODO to IN_PROGRESS is allowed | D5 | Status change between open states is 2xx at the limit |
| check_08 | Editing a title is allowed even when over the limit | D3 | Noa (7 open): title edit is 2xx, Noa keeps all 7 |
| check_09 | Unassigning a task is allowed | - | PATCH assigneeId=null is 2xx |
| check_10 | Rejection uses the standard error envelope | D8 (loose) | Rejected create returns JSON with string `code`, string `message`, and a `field` key |

## Frontend (`hidden.check.tsx`)

| Check | Real name | Decision | Verifies |
|---|---|---|---|
| check_01 | Sidebar count excludes DONE tasks | D1 | Dana's sidebar item shows 5 (her open count); a lone 6 (total) fails. "5 open - 6 total" passes |
| check_02 | Reassigning over the limit is rejected visibly | D10 | Dana option in Assign is disabled with a limit message, or saving shows a NEW limit message/alert; task stays Avi's on screen and in the db |
| check_03 | Server error message is shown and task is unchanged | Honest UI | A 409 on PATCH (`*/tasks/:id`) shows the server message; row still shows the old title/assignee |
| check_04 | Bulk assign failure does not show false success | D2, D6 | After bulk-assigning 3 loose tasks to Avi (3 open), rows showing Avi match the stored Avi tasks |
| check_05 | DONE task cannot be reopened past the limit | D2 | Same rule as check_02 for the Status dropdown (TODO/IN_PROGRESS): disabled with a visible limit message, or a new limit message after Save; stays DONE |
| check_06 | Editing a title saves and shows in the row | D3/D4 | Title edit on Dana's task reaches the row and the db |
| check_07 | Assigning via the editor updates the sidebar count | - | Assigning Loose 1 to Avi makes Avi's sidebar item show 4 without reload |

"Limit message" = text matching `/limit|too many|maximum|max/i` that was not on screen before the action, or text in the
disabled option itself. Any new `role="alert"` also counts.
