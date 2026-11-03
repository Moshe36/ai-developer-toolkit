# AI workshop — conversation handoff

This file preserves the workshop brainstorming context so a future conversation can continue without repeating discovery. Read it before proposing changes. The workshop is still being designed; the schedule and exercises are not a finalized delivery package.

## 1. Purpose and confirmed direction

The user is preparing a practical AI workshop for their enterprise development team, co-facilitated with their friend Tom.

**Primary outcome:** help developers experience agentic development and adopt a workflow they can use in their daily work.

The intended participant takeaway was expressed as:

> I completed a real task with an agent, understood how to steer and verify it, and know which workflow I will use next.

The user explicitly confirmed this direction, while emphasizing that participants need a proper lecture/teaching foundation **before** the practical work so they feel comfortable starting.

Confirmed requirements:

- Everyone tries **all four workflows**, rather than choosing only one or splitting workflows between groups.
- Everyone ultimately chooses a workflow and adapts at least one instruction, skill, or agent to their needs.
- Participants bring their laptops and operate the tools themselves.
- Participants may use a prepared exercise or their own project task for the final application activity.
- The workshop must remain **modular**: self-contained learning units with goals, prerequisites, practice, outcomes, and optional depth.
- It is now a **full-workday workshop**, not a two-hour workshop. Do not return to a two-hour constraint.
- Current timing anchors: teaching starts at **09:00**, lunch is **12:00–12:40**, and the practical finish is around **16:00**.
- Coffee and mingling are provisionally **08:30–09:00**, possibly beginning at **08:00** instead. The earlier coffee time is undecided and does not imply earlier teaching.
- All conversation and workshop drafting in this session have been in **English**. Original interview notes were Hebrew; use their information, but keep this conversation in English.

## 2. Audience, organization, and facilitators

- Expected attendance: **15–20 developers**.
- Two facilitators: the user and their friend Tom; both are AI power users.
- Most participants mainly use the IDE Copilot plugin. Some are advanced users who already create skills and agents and follow popular methods.
- Participants include **students, juniors, mid-level developers, and seniors**. Engineering experience and AI-workflow experience are separate dimensions; do not infer one from the other.
- Known stacks: **React frontend** and **Java backend**, including some **Spring Boot** users.
- Do not add C++ as a workshop track; it is not part of the current scope.
- The organization has **GitHub Copilot Enterprise** licenses.
- Harnesses in use: **GitHub Copilot IDE and CLI**, and **OpenCode**.
- Participants choose their harness. The user explicitly prefers this over requiring one common harness.
- The user prefers OpenCode; Tom prefers GitHub Copilot.
- Proposed facilitation: user provides primary OpenCode support; Tom provides primary Copilot support. One leads shared teaching while the other assists; both circulate during exercises.
- Proposed seating: nearby peers using the same harness, with individual laptop operation and peer comparison.
- The exact IDE(s), versions, model availability, and Copilot IDE/CLI paths to support still need validation.

## 3. Original interview themes and motivation

These notes seed the workshop, but the user explicitly did not want them to limit brainstorming:

1. **Model selection:** how to choose a model for a task; perceived differences between planning and execution strengths; practical rules of thumb.
2. **Prompt language and skill quality:** how wording such as “clean code” and “best practices” influences agents; how to turn preferences into better reusable guidance.
3. **Planning versus direct execution:** people want clarity about when to plan, clarify, or simply ask the agent to do a task.
4. **Loops and scope drift:** Neta described an agent repeatedly working beyond the original goal and producing unrelated implementations, consuming hours. Teach task boundaries, intervention, and when a fresh conversation with a better brief is preferable.
5. **Customization fundamentals:** Walter wanted the basics of creating skills and agents and configuring organizational tools. Explain how to make guidance useful for the actual team and stack.
6. **Different philosophies:** the user and Tom have different approaches. Participants should experience and choose between them, rather than be required to adopt one ideology.
7. **Practice creates adoption:** watching a video or hearing about a skill does not make someone comfortable using it. Participants should actually use the techniques on their own machines.
8. **Avoid information-dump training:** previous workshops felt like a checkbox exercise. The desired outcome is practical competence and reuse afterward.
9. **Logistics:** the original notes mentioned coordinating place/time with Gal. The manager has since confirmed a full workday, but the exact date, venue, and other logistics have not been recorded.

The assistant recommended translating ambiguous labels such as “best practices” into observable expectations, constraints, and examples. Model strengths should be treated as task-specific hypotheses supported by experience, rather than fixed universal rankings.

## 4. The four workflows

### A. Native / normal workflow

- Direct requests, built-in planning, and developer steering with minimal added workflow configuration.
- Serves as an initial baseline and a legitimate approach.
- The user originally suggested freestyle first so participants could feel the problems of working without a good flow.
- The assistant recommended framing this as an honest baseline rather than manufacturing failure: simple tasks may genuinely work well with a direct prompt.

### B. The user's lean, stack-aware workflow

- `grill-me` when clarification is useful.
- Custom skills for the actual React and Java/Spring Boot stack.
- Targeted agents and relatively lean instructions.
- This must remain its own workflow, separate from Tom's approach. The user explicitly corrected an earlier framing that did not distinguish it clearly enough.
- Relevant toolkit folder names are `frontend-dev-guidelines` and `backend-dev-guidelines`; the user also described these informally as frontend/backend developer skills.

### C. Superpowers

- A structured process encompassing clarification/brainstorming, planning, implementation, and verification.
- Participants should experience the applicable workflow on a small task and evaluate both its benefits and process overhead.
- Exact workshop invocation and behavior need rehearsal in the selected harnesses; do not promise identical integration behavior across them.

### D. Tom's Agentcraft workflow

- Repository: <https://github.com/tom-dorofeyev/td-agentcraft-kit>
- Language-agnostic engineering standards, including clean-code guidance, with explicit role handoffs and quality gates.
- This is **sequential specialist delegation**, not a parallel-agent demonstration.
- It overlaps with the other approaches: it also includes a `grill-me` skill, and Superpowers can also use delegation.
- Compare how workflows handle decisions, context, responsibilities, scope, and verification—not just names or feature lists.

## 5. What was inspected in the user's toolkit

Repository location:

`C:\Users\moshemoa\ai-developer-toolkit`

Files inspected included:

- `README.md`
- `setup.bat`
- `scripts/setup.ps1`
- `instructions/SHARED.md`
- `instructions/COPILOT.md`
- `instructions/VSCODE.md`
- `skills/grill-me/skill.md`
- `skills/grill-with-docs/skill.md`
- `skills/backend-dev-guidelines/skill.md` (opening sections)
- `skills/skill-rules.json` (opening sections)
- `agents/README.md` (opening sections)
- `agents/plan-reviewer.md`

Findings relevant to workshop material:

- The toolkit is organized as a shared source for instructions, skills, agents, commands, and hooks, with tool configuration linked to it.
- `SHARED.md` includes concrete scope boundaries, reading code before changing it, verification expectations, Java naming guidance, and vertical-slice planning. These are useful teaching examples.
- `grill-me` is short enough to inspect during the introductory lecture. It asks one question at a time, recommends answers, and directs the agent to investigate questions the codebase can answer.
- `grill-with-docs` adds domain terminology and documented decisions. It is a potential advanced example, not a committed core workshop module.
- `plan-reviewer` illustrates a specialized responsibility, expected context, and review output. Its definition includes Claude-oriented metadata such as `model: opus`.
- The backend skill provides explicit Java 21 / Spring Boot 3.x patterns and supporting resources.
- `skill-rules.json` describes Claude-oriented activation rules. Discovery, activation, and portability must be validated in the actual workshop harnesses; do not assume every mechanism is portable unchanged.

### Setup script — confirmed workshop role

The user repeatedly emphasized that the existing setup script should save configuration time across harnesses. Treat it as the **common setup entry point**, adapted for enterprise paths and skill sources.

- Windows preparation is the current scope.
- Linux support is a later step.
- The script currently wires several tool paths, patches VS Code settings, installs/supports ripgrep, and installs GitHub CLI when needed.
- The batch launcher calls `scripts/setup.ps1`.
- A static inspection found that `scripts/setup.ps1:32` sets `$repo = $PSScriptRoot`, which resolves to the `scripts` directory in this layout, while later paths assume the repository root. This was reported as a preparation issue; it was **not fixed or execution-tested** in this conversation.
- No toolkit source files or configuration were edited, and the setup script was not run.
- Workshop preparation should validate installation, authentication, model access, repository checks, skill/agent discovery, and a tiny end-to-end task.
- Make the selected workflow explicit. Avoid a trial unintentionally combining mandatory instructions from multiple workflow systems; the two `grill-me` definitions also need a clear selection mechanism.

## 6. What was learned from Tom's repository

The repository was read remotely, not installed or executed. The inspected tree resolved to commit `525926098927c8d6506ef9de2059594d1562febe`; recheck before relying on current details.

Inspected sources included:

- `README.md`
- `AGENTS.md`
- `docs/agent-system.md`
- `docs/install-in-a-project.md`
- `.apm/skills/code-workflow/SKILL.md`
- `.apm/skills/delegate/SKILL.md`
- `.apm/agents/builder.md`

Documented behavior at inspection time:

- Distributed through APM with Copilot and OpenCode targets; project-local and global installation are described.
- Ordinary executable changes use `code-workflow`.
- Initial stages: Builder; separate scope review; separate quality/architecture review; Refactorer; verification.
- The Refactorer should make changes only when measurable improvement is warranted; a no-change result is valid.
- Roles run sequentially. Fresh delegate sessions require self-contained handoffs.
- Findings have stable IDs, evidence, resolution conditions, and targeted re-review after corrections.
- The workflow specifies a five-cycle cap before reporting a blocker.
- Completion requires relevant review gates, static analysis, behavior-focused proof, and project checks.
- `planner` and `implementer` support more complex, approved, tracked deliverables.
- Specialist roles include Specifier, Architect, Builder, Reviewer, Refactorer, and Investigator.
- Model profiles can assign models to agents; actual identifiers and behavior depend on the runtime.

These are observations from definitions, not proof that every path works in the enterprise environment.

## 7. Teaching and exercise design

The user wants a meaningful teaching block before the labs. Do not replace it entirely with just-in-time explanations.

Current foundation proposal: **55 minutes**:

1. **10 minutes:** model, harness, tools, context, and what agentic development looks like.
2. **15 minutes:** useful prompts—goal, relevant context, boundaries, expected outcome, verification. Improve a vague request together.
3. **20 minutes:** inspect actual instructions, a small skill, and an agent; explain scope, activation, and handoff context.
4. **10 minutes:** direct execution versus planning versus clarification, checkpoints, verification, and preview of the four approaches.

Proposed lab pattern: short demonstration → individual practice → brief debrief.

- Native lab: 5-minute introduction, 15-minute practice, 5-minute debrief.
- Stack-aware lab: 5-minute demonstration, 25-minute practice, 5-minute debrief.
- Superpowers and Agentcraft: each 5-minute demonstration, 30-minute practice, 5-minute debrief.
- Prepared React and Java task variants are recommended for the guided trials, with a Spring Boot variant where appropriate.
- Tasks should share familiar domain context but have independent starting states so one failed trial does not block the next.
- Comparable task variants reduce repetition benefits, but this is a learning comparison, not a controlled scientific benchmark.
- Everyone operates their own laptop. Peer support should not replace individual participation.
- Advanced participants can inspect handoffs, adapt guidance, or attempt stretch tasks.

Use the same comparison questions after each trial:

- Were requirements met?
- Did the agent stay within scope?
- How much steering was needed?
- What verifies the result?
- Was the process worth the effort?

The final adoption block allows a prepared task or a bounded task from a ready-to-run personal work project. The current 60-minute proposal is:

- 10 minutes: choose workflow and task.
- 10 minutes: adapt an existing instruction, skill, or agent.
- 30 minutes: apply it, inspect changes, and verify behavior.
- 10 minutes: peer walkthrough of the result and the customization's observed effect.

Building a substantial new skill or project from scratch is a stretch/follow-up activity at this duration.

### Agreed approach for mixed experience levels

After the initial handoff was saved, the user raised Tom's concern: less experienced participants may be able to operate an agent but lack the engineering judgment to recognize why planning, review, or a structured workflow helps. They could mistake more generated code or a longer plan for a better result.

**The user accepted the recommendation to combine a worked example, tiered exercise support, and explicit acceptance checks.** Treat this as an agreed teaching-design requirement, not an unresolved option. Everyone still tries all four workflows and adapts one.

#### 1. A worked example before independent comparison

- Demonstrate a small, understandable change and explain the reasoning behind the decisions.
- Show how clarification or planning resolves uncertainty, identifies boundaries, and determines what to verify.
- Connect each useful planning decision to implementation or verification so its benefit is observable.
- Also show when a small, obvious change can use a direct prompt. Do not teach that longer plans or more process are inherently better.
- Illustrative example proposed by the assistant: adding filtering to a task list, including empty results, displayed counts, sort preservation, and existing behavior. **This example is not yet selected as the actual workshop exercise.**

#### 2. One core outcome with selectable support levels

- **Guided path:** identify relevant files, supply a starter prompt, offer hints, and provide verification commands.
- **Independent path:** provide the task brief and acceptance criteria; participants determine their approach.
- **Stretch path:** add a constraint, inspect a handoff, or improve a skill.
- Participants select the support they need rather than being assigned a path solely by seniority or title.
- Keep the basic outcome and acceptance criteria consistent across support levels. Stretch work is additional.
- The guided path must retain meaningful decisions; avoid reducing it to copying a recipe without understanding.

#### 3. Explicit acceptance checks and evidence

- Each exercise includes a short acceptance checklist and runnable or manual verification steps.
- Give beginners a concrete way to judge correctness without first requiring them to design the whole solution.
- Illustrative criterion: filtering by “Open” shows only open tasks, updates the count, preserves sorting, and displays the agreed empty state when nothing matches.
- Use concrete debrief prompts: Which requirement did you verify? What assumption did the agent make? Did it change anything outside the task? What did you have to correct?
- Keep the workflow comparison task-specific:

> For this task, what did the workflow help you notice or prevent, and what extra effort did it require?

The goal is evidence-based judgment at every experience level, not a universal workflow ranking.

#### Delivery implications and remaining choices

- Incorporate the worked example into the existing teaching/demonstration blocks and use acceptance checks during lab debriefs. Exact allocation within those blocks still needs design; no extra time or schedule change has been approved for this addition.
- Rehearse with participants of differing experience to check whether the scaffolding is sufficient and the tasks fit.
- Additional ideas discussed, but not separately required by the user's acceptance: a “predict, observe, explain” prompt before execution; and narrowly scoped peer review where each person keeps control of their own keyboard. These can support the agreed approach if useful.
- The current HTML draft 04 predates this mixed-experience decision. This handoff records the newer requirement; the HTML and exercise material still need to incorporate it.

## 8. API integrations — deliberately limited scope

The user clarified that “tokens” means **API access tokens**, not LLM token budgets or Figma design tokens.

Initial ideas included:

- Retrieving Figma design context without MCP, which is not currently supported in their environment.
- Reading/creating/updating Azure DevOps work items.
- Pushing branches, creating/updating PRs, reading review comments, applying fixes, and replying.

The user subsequently narrowed this explicitly:

- **Five-minute presenter demonstration only**, using something such as Figma to open people's minds to possibilities.
- No participant API configuration or hands-on API integration track in the core workshop.
- Do not let API-backed actions, Azure DevOps automation, or PR lifecycle automation become the workshop's main objective.
- These remain future possibilities, not required workshop deliverables.

No API credentials were provided or configured. No external project, PR, or work-item actions were performed.

## 9. Current schedule — draft 04

Timing anchors are user-provided. Internal module placement and durations are the assistant's current proposal, pending further review and rehearsal.

| Time | Minutes | Activity |
|---|---:|---|
| 08:30–09:00 | 30 | Coffee and mingling; may instead start at 08:00 |
| 09:00–09:15 | 15 | Setup and readiness |
| 09:15–10:10 | 55 | Foundations: prompts, context, instructions, skills, agents |
| 10:10–10:35 | 25 | Trial A: native workflow |
| 10:35–10:50 | 15 | Break |
| 10:50–11:25 | 35 | Trial B: user's stack-aware workflow |
| 11:25–11:40 | 15 | Model selection |
| 11:40–12:00 | 20 | Recover from loops and scope drift |
| 12:00–12:40 | 40 | Lunch — fixed |
| 12:40–13:20 | 40 | Trial C: Superpowers |
| 13:20–14:00 | 40 | Trial D: Agentcraft |
| 14:00–14:15 | 15 | Compare the four workflows |
| 14:15–14:30 | 15 | Break |
| 14:30–15:30 | 60 | Choose, adapt, and apply |
| 15:30–15:35 | 5 | API possibilities demo |
| 15:35–15:50 | 15 | Share results and choose the next use |
| 15:50–16:00 | 10 | Flexible buffer / questions |

Verified arithmetic:

- 450 minutes from 08:30 to 16:00, including coffee.
- 420 minutes from 09:00 to 16:00.
- Within the 420 minutes: 340 minutes learning/readiness, 70 minutes lunch/breaks, 10 minutes buffer.
- No gaps or overlaps; all detailed module durations matched the timeline at last verification.
- Moving coffee to 08:00 would add 30 social minutes, not teaching time.

Why this order:

- Fixing lunch at noon would interrupt the previously positioned Superpowers trial.
- Model selection and recovery were moved before lunch, using exactly 35 minutes after the stack-aware trial.
- Superpowers and Agentcraft moved after lunch; all module durations were preserved.
- Two workflow trials now run before lunch and two afterward.
- Recovery lessons can be applied in the afternoon trials.

### Practicality assessment already communicated

**Feasible, but tight and dependent on preparation.** The timing has been arithmetically checked, not validated by running the workshop.

- The 15-minute readiness slot assumes installation, authentication, script behavior, and repository builds have been checked beforehand.
- Structured trials have only 30 minutes of hands-on execution each. Rehearse the exact tasks in both harness paths; shrink tasks rather than silently skip mandatory workflow stages.
- Final practice supports one small adaptation and one bounded task, not a fresh project or substantial feature.
- Workflow switching and short resets must fit within lab budgets.
- There are 70 minutes between the morning break and lunch, and 95 minutes between lunch and the afternoon break.
- Only 10 minutes of buffer remains.
- Suggested levers if rehearsal overruns: move deeper model comparisons to follow-up material or finish setup before 09:00; protect all four trials and the final adoption activity.

### Superseded timing proposals

- The early two-hour idea was exploratory and is no longer the workshop constraint.
- An eight-hour draft totaled 480 minutes and included 85 minutes of final adaptation.
- The seven-hour draft reduced readiness, lunch, model selection, recovery, adaptation, reflection, and buffer by 60 minutes total, while preserving foundations and all four trial budgets.
- Current lunch is **12:00–12:40**, replacing the earlier 13:00–13:40 proposal.

## 10. Browser drafts and local artifacts

The user accepted a browser-based visual companion. HTML drafts were created locally using the brainstorming skill's companion server.

Latest HTML at the time of this handoff:

`C:\Users\moshemoa\AppData\Local\Temp\opencode\ai-workshop-map\.superpowers\brainstorm\1448-1792484300\content\full-day-schedule-v4.html`

Other known files in that content directory include:

- `workshop-map.html`: earlier interactive module map with selection/reordering and optional advanced integration modules. Its content and timing are **superseded** by the current scope and schedule.
- `waiting-full-day.html`: temporary waiting screen, not workshop material.
- Prior detailed drafts were moved/renamed during updates; do not assume `full-day-draft.html` or `full-day-schedule.html` still exists.

Companion state directory:

`C:\Users\moshemoa\AppData\Local\Temp\opencode\ai-workshop-map\.superpowers\brainstorm\1448-1792484300\state`

Operational notes:

- This is a **local** companion, not a public website. It was listening on port `61975`.
- The complete authorized URL is stored in `state\server-info`; read it rather than inventing a URL or dropping its query key.
- The user reported that the website was inaccessible. Investigation found no listener and connection refusal on both localhost and 127.0.0.1.
- Launches attached to background tool sessions did not remain available across later conversation turns. The precise termination cause was not established.
- A separate hidden Windows Node process launched with PowerShell `Start-Process` restored access. Subsequent checks served the latest HTML successfully.
- Process IDs are transient. Do not rely on the original PID or assume the server survives a future session.
- Standalone logs: `state\server-standalone.log` and `state\server-standalone-error.log`.
- Persisted port/token files: `.superpowers\brainstorm\.last-port` and `.last-token` under the temporary `ai-workshop-map` folder.
- The companion serves the newest HTML screen. Verify the response contains the current draft before sharing a link.
- The HTML is under a temporary directory and may be cleaned up. This handoff file is the durable textual source for the workshop decisions and schedule.

At the last update, verification checked timeline continuity, every row's duration, the fixed lunch slot, the total day length, agreement with detailed modules, and an HTTP 200 response containing draft 04. It did not measure actual lab execution time or validate the setup script.

## 11. Work completed and work not yet done

Completed:

- Interview themes translated and incorporated into brainstorming.
- Audience, goals, four workflows, participant choice of harness, and API demo scope clarified.
- Relevant local toolkit files and Tom's repository definitions inspected.
- A modular full-day curriculum and updated timed HTML draft created.
- Local browser access repaired and current schedule verified structurally.
- This durable handoff file created at the user's request.
- Mixed-experience teaching approach agreed and recorded: worked example, selectable exercise scaffolding, and explicit acceptance checks.

Not yet done:

- Core exercise **designed (draft, not built)**: the "Workload Limit" user story, with backend and frontend tracks, the same task run with each of the four workflows, a product-owner card, and hidden acceptance tests. See `exercises/workload-limit.md`. The starting app and hidden test suites are not built yet.
- No detailed lecture script, presentation deck, participant workbook, or facilitator guide produced.
- No enterprise adaptation of the setup script implemented.
- No workflow switching mechanism selected or tested.
- No integration installation, model comparison experiment, or workflow rehearsal performed.
- No Figma API demonstration implemented.
- No final workshop design approval or delivery date recorded.
- No toolkit files were modified, and no Git commits or pushes were made.

## 12. Open decisions and next useful work

The user has agreed how to support students through seniors and asked to record that decision. The current schedule remains draft 04; the mixed-experience approach in section 7 is a newer agreed requirement awaiting incorporation into the HTML and detailed exercises.

Useful next steps, without assuming they are already approved:

1. Review the current timing balance and confirm coffee start (08:00 or 08:30).
2. Design small, representative React and Java exercises with guided, independent, and stretch support plus explicit acceptance checks. No concrete task examples have been supplied by the user; the assistant's task-list filtering example is illustrative, not approved exercise content.
3. Build the foundation teaching material with a worked example that makes planning and verification benefits visible, alongside actual prompt, instruction, skill, and agent examples. Update the HTML to reflect this agreed approach within the existing time budget.
4. Define which Copilot IDE/CLI interfaces are supported and rehearse all four workflows in both harness paths.
5. Specify enterprise setup sources/paths and how to switch active workflows cleanly.
6. Pilot the exercises and adjust scope or timing based on measured completion and verification time.
7. Prepare a bounded failure example and a five-minute Figma demonstration.
8. Finalize facilitator ownership, room/date logistics, and any participant prework.
9. Optionally arrange a short follow-up one week later to learn what participants reused. This is an assistant suggestion, not a confirmed commitment.

Keep future collaboration concise, practical, and in English. Do not restart answered discovery questions or re-expand the API integration track. Preserve the user's priority: foundational teaching, everyone experiencing all four workflows, and hands-on adoption of one.
