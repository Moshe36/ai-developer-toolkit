# Workshop Exercise — "Workload Limit"

> Status: **DRAFT v2 for review.** Not built or rehearsed. Decisions marked *(proposal)* still need approval.

---

## 1. What this exercise teaches

Developers get a **realistic, slightly vague ticket**, the kind that shows up in real sprints. They implement it once with a one-shot prompt, then again with planning workflows that **force questions before code**.

The message we want them to leave with:

> I didn't think of these cases myself. A one-shot prompt didn't either. When the agent was forced to explore and question before coding, the result covered them, even though I'm the same developer with the same knowledge.

The exercise **doesn't** reward knowing our private product decisions. Hidden tests only check behavior that **any sensible answer** would produce (section 6).

| Trial | Workflow | What the participant does |
|---|---|---|
| A | Native | One-shot prompt from the ticket. Run checks. |
| B | Lean stack-aware (grill-me + stack skills) | Same ticket, reset code |
| C | Superpowers | Same ticket, reset code |
| D | Agentcraft | Same ticket, reset code |

---

## 2. The ticket (identical in every trial)

> **TASK-214 — Prevent overloading team members**
>
> Team leads report that some people end up with way too many open tasks while others are idle. Add a rule: **a team member can't have more than 5 open tasks assigned to them.** If someone tries to go over, they should get a clear message.

Why this ticket works:
- It's real: workload limits exist in Jira/Linear-style tools and in support queues.
- It has a purpose (overload) that lets an agent reason about edge cases.
- It's vague in the normal way: it says *what*, not *where* or *every case*.

### No product-owner card *(changed from v1)*
Participants answer the agent's questions **from their own judgment**. Workflows like grill-me also recommend answers, which helps juniors.
Different answers are expected and fine. Hidden tests are designed to accept any reasonable choice.

---

## 3. Tracks

| Track | Who | Stack |
|---|---|---|
| Backend | Java / Spring Boot developers | Spring Boot 3.x, Java 21, JUnit 5 |
| Frontend | React developers | React + TypeScript, Vitest, Testing Library, MSW mock API |

Optional full-stack variant: section 10.

---

## 4. The starting app — "Team Task Tracker"

Everything here **already exists** at git tag `ex-start`.

### 4.1 Domain

```
Member { id, name }
Task   { id, title, status: TODO | IN_PROGRESS | DONE, assigneeId?: string, createdAt }
```

### 4.2 The four ways a member gains an open task (the heart of the exercise)

| # | Path | Endpoint | Why one-shot usually misses it |
|---|---|---|---|
| 1 | Create a task with an assignee | `POST /tasks` | Usually caught |
| 2 | Change a task's assignee | `PATCH /tasks/{id}` | Usually caught |
| 3 | Bulk assign | `POST /tasks/bulk-assign` | A separate service method, easy to miss |
| 4 | **Reopen a DONE task** | `PATCH /tasks/{id}` (status) | Not about "assignment" at all. Found only by exploring the code or asking "how else can the count go up?" |

### 4.3 Backend (existing)

```
GET    /members                      -> [{ id, name, assignedTaskCount }]
GET    /tasks?status=&assigneeId=&sort=&page=&size=
POST   /tasks                        { title, assigneeId? }
PATCH  /tasks/{id}                   { title?, status?, assigneeId? }   // assigneeId: null = unassign
POST   /tasks/bulk-assign            { taskIds: [], assigneeId }
```

- `TaskController` → `TaskService` / `AssignmentService` → repository (H2 or in-memory)
- **Existing error envelope** for 400/404: `{ "code", "message", "field" }` via `@ControllerAdvice`
- Existing tests pass
- **Scope bait:** a messy but working `AssignmentService`

### 4.4 Frontend (existing)

- Task table: filters, sort, bulk select + "Assign to…"
- Edit drawer: title, status (including reopening), assignee dropdown
- Members sidebar: name + `assignedTaskCount`
- MSW mock API matching the backend contract
- Existing tests pass
- **Scope bait:** a messy but working ~400-line `TaskTable.tsx`

---

## 5. Decisions a good questioning workflow should bring up

These are **not answer keys**. They're what facilitators listen for, and they're revealed in the debrief as "things a planned workflow asked about".

| # | Decision | Tested? |
|---|---|---|
| D1 | Which statuses count as "open"? | **Yes, partly:** DONE must not count (the ticket says "open") |
| D2 | Every path where the count can grow, including **reopen** and **bulk** | **Yes:** the limit must hold on all paths |
| D3 | Members already over the limit today | **Yes, partly:** their unrelated edits must still work |
| D4 | Reassigning to the same member | **Yes:** must not be rejected |
| D5 | Status changes that don't change the count (TODO → IN_PROGRESS) | **Yes:** must not be rejected |
| D6 | Bulk: all-or-nothing vs. partial | **No:** either is fine. Tested only through the invariant. |
| D7 | Fixed vs. configurable limit | **No:** debrief only |
| D8 | Exact HTTP status and error code | **No:** any 4xx using the existing envelope |
| D9 | Exact message wording | **No:** debrief only |
| D10 | Frontend: disable at-limit members vs. let the server reject | **No:** either is fine, as long as the user isn't misled |

---

## 6. Hidden tests

### 6.1 The rule for including a test

A hidden check stays **only if a senior reviewer would call its failure a bug no matter which reasonable product choice was made.**

So we test **invariants and consequences**, not choices:
- **Invariant:** after any action, no member *gains* an open task beyond the limit.
- **No collateral damage:** legitimate actions that don't add open tasks still work.
- **Honest UI:** the user is never told something succeeded when it didn't.

Calibration in rehearsal: any check that fails for a good-faith planned run whose choices were reasonable gets **removed or loosened**.

Participants run `./verify` (backend) or `npm run verify` (frontend) and see only:
`Hidden checks: 7 / 10 passed · Existing tests: PASS`

### 6.2 Backend: 10 checks

Default setup: limit 5 (whatever mechanism the participant used). **Dana** has exactly 5 open tasks.

| ID | Scenario | Passes if | Decision |
|---|---|---|---|
| B01 | Create a task assigned to Dana | Rejected (any 4xx), Dana still has 5 open | D2 |
| B02 | Reassign Avi's task to Dana | Rejected, task still Avi's | D2 |
| B03 | Bulk-assign 2 unassigned tasks to Dana (who has 4) | Afterward Dana has **≤ 5** open (all-or-nothing **or** partial accepted) | D2, D6 |
| B04 | Reopen Dana's DONE task | Rejected, task still DONE | D2 |
| B05 | Dana has 5 open + 3 DONE; complete one, then assign a new one | Accepted (DONE doesn't count) | D1 |
| B06 | Reassign one of Dana's tasks to Dana | Not rejected | D4 |
| B07 | Move Dana's task TODO → IN_PROGRESS | Not rejected | D5 |
| B08 | Noa is seeded with 7 open; edit a task title | Not rejected, Noa keeps her tasks | D3 |
| B09 | Unassign one of Dana's tasks | Not rejected | — |
| B10 | Any rejection above | Uses the existing envelope `{code,message,field}`, not a 500 or a new format | D8 (loose) |

Plus: **the whole existing suite still passes.**

Sketch:

```java
@Test
void check_04() { // real name: reopeningDoneTaskCannotPushMemberOverLimit
    var dana = seed.memberWithOpenTasks("Dana", 5);
    var doneTask = seed.doneTaskAssignedTo(dana);

    var response = client.patch("/tasks/" + doneTask.id(), Map.of("status", "TODO"));

    assertThat(response.status()).isBetween(400, 499);
    assertThat(repository.find(doneTask.id()).status()).isEqualTo(DONE);
}
```

### 6.3 Frontend: 7 checks

The mock API enforces the rule server-side (like the real backend after the change) and exposes `openTaskCount` per member. Seed: Dana 5 open, Avi 3, Noa 7.

| ID | Scenario | Passes if | Decision |
|---|---|---|---|
| F01 | Members sidebar | Shows open-task counts that exclude DONE | D1 |
| F02 | Assign Avi's task to Dana via the edit drawer | Either the option is unavailable with a visible reason, **or** the save shows an error. Either way, the task stays Avi's on screen. | D10 |
| F03 | Server returns 4xx on a save the UI thought valid | The error message is shown; the UI **doesn't show the change as saved** | Honest UI |
| F04 | Bulk assign 3 tasks to Avi (3 open) | The user isn't told all 3 succeeded when they didn't; the screen matches the server afterward | D2, D6 |
| F05 | Reopen Dana's DONE task | Same as F02: prevented or error shown; status stays DONE on screen | D2 |
| F06 | Edit the title of one of Dana's tasks | Saves normally | D3/D4 |
| F07 | Successfully assign a task to Avi | Avi's count updates without a reload | — |

Plus: **existing tests pass.**

> Frontend checks rely on visible text and roles. Before the workshop, rehearsal must confirm they don't fail on legitimate UI choices. If a check is too tied to our markup, loosen it or move it to the rubric.

### 6.4 Measured from the diff (not scored)

- Files changed outside the expected area
- Whether the scope bait (`AssignmentService`, `TaskTable.tsx`) was refactored
- Lines added/removed

---

## 7. What participants record per trial

| Field | Source |
|---|---|
| Hidden checks passed | `verify` |
| Existing tests pass? | `verify` |
| Minutes, total | Timer |
| Minutes reading plans/handoffs | Self-estimate |
| Steering interventions | Tally |
| **Decisions the agent asked me about** (D1–D10 checklist, filled in **after** the reveal) | Re-read the session |
| Out-of-scope changes | Diff script |

The "decisions asked" column is the core evidence: it shows *what the workflow surfaced that the developer didn't think of*.

---

## 8. Session flow

### Per trial

1. `git checkout -f ex-start && git clean -fd`
2. Switch active workflow
3. Fresh agent session; paste the ticket
4. Answer the agent's questions from your own judgment. **Don't volunteer edge cases the agent didn't ask about.**
5. Stop at the time box. Unfinished counts as data.
6. Run `verify`, record the row
7. Short debrief on the process only. No reveal yet.

### Trial A (native)

One-shot only: paste the ticket, let it run, no follow-ups. Prompt-writing is covered in the foundations lecture, not here.

### Comparison block

1. **Reveal** section 5 (the decisions) and the real test names
2. Each participant fills in "decisions the agent asked me about" per trial
3. Room scoreboard: median checks passed, decisions surfaced, time, interventions, scope violations, per workflow
4. Discussion:
   - Which decisions did *no one* think of in Trial A?
   - Who found the **reopen** path, and in which workflow? How was it found: exploring code, or a question?
   - Where did the extra questioning cost more than it was worth?
   - D6–D10 have no right answer. What did different people choose, and why?

---

## 9. Support levels (same ticket, same checks)

| Level | Gets |
|---|---|
| **Guided** | Pointers to the main files; "follow the agent's recommended answer if unsure"; hints on request (hints don't reveal decisions) |
| **Independent** | Ticket only |
| **Stretch** | After finishing: review the agent's plan, find one decision it missed, and improve the workflow's skill or instructions so it would ask next time |

---

## 10. Full-stack variant (optional, final block)

Same ticket, both layers, no mock. Extra natural traps: both layers must agree on what counts as open, and the UI must handle the error the backend actually returns. Verified by running both hidden suites against the real backend.

---

## 11. Honest risks

| Risk | Mitigation |
|---|---|
| Learning carryover: by Trial C people know the edge cases and answer accordingly | Rule: don't volunteer what wasn't asked. Record "decisions the agent asked". Say it openly. |
| Without a product-owner card, a planned run may make an unusual but defensible choice | Invariant-based checks (6.1) plus rehearsal calibration |
| One-shot in Trial A might get lucky and pass most checks | Fine. It's honest. The "decisions asked" column still shows the difference. |
| C/D don't finish in time | Rehearse; trim bulk if needed; unfinished counts as data |
| Frontend checks too tied to markup | Rehearsal calibration |
| Single runs are noisy | Compare room medians |

---

## 12. Still open

1. Approve the ticket wording (section 2)
2. Workflow switching mechanism per harness
3. Time box per trial vs. the draft-04 schedule
4. Who builds the starting app and hidden suites, and when we rehearse
5. Rehearsal plan: run each workflow at least twice per track to calibrate checks
