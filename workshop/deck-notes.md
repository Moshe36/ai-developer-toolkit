# Workshop deck — working notes

Everything needed to continue work on the workshop slide deck in a new conversation. Read this file first, then `workshop-plan.md` for the workshop as a whole.

- **Deck:** `workshop/agentic-workshop.pptx` (English, 16:9 wide). **This file is the source of truth and contains manual edits.**
- **Generator:** `workshop/deck-src/build-deck.js` is a slide factory for **new** slides in the deck's style. It is not a mirror of the deck, and it refuses to write the real deck.

> **Never regenerate or overwrite `agentic-workshop.pptx`.** Edit existing slides directly in the .pptx through PowerPoint COM. For a new slide, build it to a temp file and copy just that slide in with `deck-src/replace-slides.ps1` (see section 6). Slide numbers are PowerPoint slide-number fields, never typed text. The slide map in section 3 is from the original generation and may not match the deck after manual edits; check slide titles in the real deck.
- **Workshop plan:** `workshop/workshop-plan.md`
- **Exercise draft (separate effort):** `workshop/exercises/workload-limit.md`
- **Original source deck:** `C:\Users\moshemoa\Downloads\מצגת להעביר בעבודה (1).pptx` (Hebrew, 45 slides, for a ~3-hour talk "A day in my life: AI for productivity"). Never modify it.

## 1. Purpose and agreed direction

The deck supports a full-day, hands-on workshop (09:00–16:00, coffee from 08:30, lunch 12:00–12:40) for 15–20 developers (students to seniors; React and Java/Spring Boot), facilitated by Moshe (OpenCode) and Tom (GitHub Copilot). Participants try four workflows (A Native, B Moshe's stack-aware, C Superpowers, D Tom's Agentcraft), compare them on evidence, then adapt one.

User decisions about the deck, in order:

1. Build a **new** workshop deck rather than appending to the original; never delete or modify the original.
2. **Verify** the original's context-window slides (7–8) with web research before reusing them, and add corrected slides.
3. **Remove "thinking mode"** entirely. The user considers it irrelevant now, since every model reasons.
4. **Don't add needless caveats.** The user objected to remarks implying they claimed skills are bulletproof, and asked that advice slides be presented as advice ("don't talk crap just because"). Present suggestions plainly; correct only things that are actually wrong.
5. **Expand Superpowers** properly; the workshop has much more time than the original 3-hour talk.
6. **Add explanations**, because the ideas matter. Every slide has speaker notes; leads under titles explain the point.
7. Add the **building blocks** explanation (model, harness, context, workflow; instructions, skills, agents).
8. Add **placeholders** for screenshots and demos not yet available.
9. Add **decision guidance** and **workshop navigation**.
10. Second pass: bring back more of the original (information, memes, screenshots), **more slides are fine — the user will filter**, add **current buzzwords with what they actually mean**, and add the **main idea**: apply the software engineering principles we already know to agentic work. The user considers this the core idea behind better agentic coding.
11. Commit and push when asked (done for the deck and plan; see section 8).

## 2. Design system (in `build-deck.js`)

- Layout `LAYOUT_WIDE` (13.333 × 7.5 in). Margin 0.6 in; content width 12.133 in.
- Palette: ink `193B33`, muted `55665F`, green `2E6B57`, lime `B9DA78`, tint `EEF4EC`, soft `DCE8DE`, dark `12302A`, amber `A8620F`, amber tint `FBF0E1`.
- Fonts: Cambria (titles), Calibri (body), Courier New (code).
- Content slides: white background, 30 pt title, 16 pt muted lead line, body from y = 1.95 in, footer with section/time at bottom left and page number at bottom right.
- Section and closing slides: dark background with lime outline circles (the visual motif). No accent bars or underlines.
- Amber/dashed boxes with the word PLACEHOLDER mark content still to add. Amber cards also mark warnings and "where you decide" checkpoints.
- Helpers: `content`, `section`, `card`, `labelled`, `numberedRows`, `chip`, `darkBand`, `table`, `termTable`, `placeholder`, `fitImage` (supports `crop: { top, bottom, alignLeft }`), `arrow`, `circle`.

## 3. Slide map (75 slides)

PH = contains a PLACEHOLDER. "orig N" = based on the original deck's slide N.

### Opening
1. Title: Agentic Development — "Try four ways. Make one your own."
2. Why we are here (practice over slides, four ways, make one your own; goal sentence)
3. **The main idea:** "Agentic coding is still software engineering." (chips: clear requirements, design before code, small steps, tests, code review, version control, definition of done)
4. What we want to avoid — Brent Rambo "Quality work" meme (orig 2)
5. The day at a glance (morning/afternoon schedule tables)
6. How every lab works (demo → practice → verify → record → debrief; guided/independent/stretch support)
7. Get ready 09:00–09:15 (setup script steps) — PH: setup command and screenshot

### Foundations
8. Section: Foundations
9. From suggestions to delegated work (autocomplete / chat / agent) (orig 20–23)
10. An agent at work — Copilot agent screenshot with callouts (orig 24)
11. What an LLM actually is: Large / Language / Model (orig 4)
12. Four building blocks: model, harness, context, workflow
13. The agent loop, and what counts as evidence
14. Tokens (corrected; orig 6)
15. The context window (corrected; orig 7)
16. What happens when it fills up (corrected; replaces orig 7–8)
17. Keep the context clean + handoff summary template (orig 8 remedy kept)
18. Handoff in practice — orig 8 screenshot + Ted Lasso "Pro move" meme (orig 41)

### Same engineering, new teammate (the main idea)
19. Section: Same engineering, new teammate
20. Treat the agent like a fast new teammate (new hire → agent mapping)
21. Old principles, applied to agents: before the code (table)
22. Old principles, applied to agents: during and after (table)

### Briefs and prompts
23. Give the agent a task it can finish: goal, context, boundaries, success, verification
24. Prompt principles that still hold — orig 5 screenshot of a long planning prompt
25. Same request, two briefs (vague vs useful, with tag chips)
26. Open the design, constrain the implementation (orig 17)
27. Ask for the architecture before the implementation — orig 18 screenshot (cropped)
28. Turn "clean code" into expectations (examples from `instructions/SHARED.md`)

### Instructions, skills, agents
29. Instructions, skills and agents (overview)
30. Instructions — orig 16 screenshot of the global instructions file
31. Anatomy of a skill — frontend skill screenshot (orig 30)
32. Skills can carry resource files — orig 29 screenshot
33. Seeing a skill in use — Copilot CLI screenshot (orig 28)
34. Let AI help you write the skill (Skill Creator) — orig 9 screenshot (orig 32)
35. Extending the harness: plugins, Skill Creator, LSP (orig 31)
36. Agents and subagents — PH: plan-reviewer.md and a delegation screenshot
37. A team of agents (tech lead, backend, frontend, QA; spec as contract) — Smithers meme (orig 39–40)
38. Quick check: where does it belong? (answers in notes: instruction, skill, agent)

### Decisions and control
39. Choose how to start (decision table)
40. Spec-driven development (orig 38; GitHub Spec Kit)
41. What a useful plan contains (orig 26; generic vs useful plan)
42. Stay in control while it runs (checkpoints; signals to step in)
43. Diagrams as code with Mermaid (orig 34)
44. You own the result (risk table, video-feature story, "don't ask for code you couldn't review") (orig 35–37)

### Buzzwords, decoded
45. Section: Buzzwords, decoded
46. Vibe coding vs. agentic engineering (Karpathy, Feb 2025 vs Feb 2026)
47. Ways of working (agentic engineering, context engineering, spec-driven development, harness engineering, human-in-the-loop, Software 3.0 [HYPE])
48. Building blocks (agent loop, harness, tool calling, MCP, Agent Skills, AGENTS.md)
49. More building blocks (subagents, RAG, reasoning models, A2A)
50. Running agents (plan mode, YOLO/autopilot [SLANG], cloud coding agents, GitHub Agentic Workflows, parallel agents + worktrees, compaction, Ralph loop [FOLK])
51. Quality and risk (context rot, hallucination/slopsquatting, AI slop [PEJORATIVE], prompt injection, lethal trifecta, evals, LLM-as-judge)

### Wider toolbox
52. Section: The wider toolbox
53. Pick the tool for the job (orig 13–15, as advice)
54. Requirements from documents: Microsoft 365 Copilot, tips and limits (orig 10–12) — PH: replacement screenshot (the original is in Hebrew and shows internal requirement IDs)
55. Working in the terminal and the IDE chat (orig 21, 27)
56. Small wins: commit messages with AI — orig 22 screenshot (cropped)

### Workflow trials
57. Section: Four workflows
58. Four workflows at a glance (table)
59. Every trial follows the same routine + trial-row fields — PH: reset/switch/verify commands from the exercise handout
60. Trial A · Native 10:10–10:35
61. Trial B · Stack-aware 10:50–11:25 (grill-me → stack skills → targeted agents) — PH: demo screenshot
62. Choosing a model 11:25–11:40 (rules of thumb; judge by) — PH: models in our Copilot Enterprise plan with premium request multipliers
63. When the agent loops or drifts 11:40–12:00 (signals / do / restart well; anonymised team story)
64. Trial C · Superpowers 12:40–13:20 (philosophy) — PH: demo
65. Superpowers: the workflow (7 skills; "You" checkpoints in amber)
66. Superpowers: how execution works (subagent-driven development vs executing-plans; rules; install)
67. Trial D · Agentcraft 13:20–14:00 (Builder → scope review → quality review → Refactorer → verification)
68. Compare the four 14:00–14:15

### Make it yours and closing
69. Section: Make it yours
70. Choose, adapt, apply 14:30–15:30 (10/10/30/10 minutes; adaptation ideas)
71. Possibilities: agents + APIs 15:30–15:35 (Figma via access token; token hygiene) — PH: live demo
72. Take it with you (three habits + next-task commitment)
73. Bonus: making presentations with AI — orig 44 prompt screenshot (orig 42–44)
74. Bonus: push back when the model is wrong — Gemini screenshot (Hebrew)
75. Questions / thank you

## 4. Verified facts and corrections (do not regress)

**Context window (replaces the original slides 7–8):**
- The context window is the token budget of one request: system prompt, tool definitions, instructions, loaded skills, files read, tool output, history and the reply. The model is stateless; the harness resends the history.
- It does **not** slide FIFO. At the API, an over-limit request is rejected (OpenAI has an optional truncation setting, off by default). Coding tools **compact**: they replace older turns with a summary, so details can be lost.
- Copilot CLI starts background compaction at about 80% (docs.github.com/en/copilot/concepts/prompting-and-context/context-management). OpenCode has automatic, configurable compaction (opencode.ai/v2/docs/config). Claude Code auto-compacts and has `/compact` and `/clear`.
- There is **no universal degradation percentage**. Quality declines gradually with length and distractors: Lost in the Middle (Liu et al. 2023, arxiv.org/abs/2307.03172), Context Rot (Chroma 2025, research.trychroma.com/context-rot).
- The original's handoff-summary remedy is valid and is kept.

**Tokens:** English ≈ 4 characters ≈ 0.75 words per token (OpenAI). Hebrew ≈ 1.5–4 tokens per word depending on the tokenizer; newer tokenizers are more efficient.

**Superpowers** (github.com/obra/superpowers, by Jesse Vincent / Prime Radiant, MIT):
- Workflow: brainstorming → using-git-worktrees → writing-plans → subagent-driven-development or executing-plans → test-driven-development → requesting-code-review → finishing-a-development-branch.
- Human checkpoints: approve the design, review the plan and say go, choose how to finish; it also stops for destructive, security-sensitive or outside-the-worktree actions, or a broken plan.
- Subagent-driven development: a fresh implementer subagent per task, **sequential, never parallel**; each task reviewed for spec compliance and quality; a final whole-branch review; no pausing between tasks. `executing-plans` is the cheaper inline alternative.
- TDD and verification are strongly worded **instructions**, not tooling. Don't call it "two-stage review" (outdated wording).
- Install: Copilot CLI `copilot plugin marketplace add obra/superpowers-marketplace` then `copilot plugin install superpowers@superpowers-marketplace`; OpenCode via `.opencode/INSTALL.md` in the repo.

**Agentcraft** (github.com/tom-dorofeyev/td-agentcraft-kit, read at commit 525926098927): `/code-workflow` runs Builder → scope review → quality/architecture review → Refactorer → verification, sequentially in fresh sessions, with tracked findings and a five-cycle cap; `/planner` and `/implementer` handle larger tracked work.

**Buzzword sources:** Karpathy "vibe coding" (Feb 2025; martinfowler.com/bliki/VibeCoding.html) and "agentic engineering" (Feb 2026; x.com/karpathy/status/2019137879310836075); OpenAI harness engineering (Feb 2026; openai.com/index/harness-engineering); GitHub Agentic Workflows (docs.github.com/en/copilot/concepts/agents/about-github-agentic-workflows); Agent Skills (agentskills.io); AGENTS.md (agents.md); lethal trifecta (simonwillison.net/2025/Jun/16/the-lethal-trifecta). Some origins and dates (Spec Kit, MCP's donation, A2A hosting, Ralph loop, Context Rot date) were not verified in-session, so the deck states them without dates.

**Removed or adjusted from the original:**
- Thinking mode (at the user's request).
- The tool-comparison claims are now a "which tool for which task" advice table.
- Decoration images (backgrounds), the Statham coffee GIF, and the Russian "designer" GIF were left out.
- The Hebrew Microsoft 365 screenshot was left out because it shows internal requirement IDs.

## 5. Images

All in `workshop/deck-src/`:

- `agent-mode.png`, `copilot-cli.jpg`, `skill-structure.jpg`: original slides 24, 28, 30.
- `orig/sNN-imageX.*`: extracted from original slide NN. These are the ones used: s02 (Brent Rambo GIF), s05 (planning prompt), s08 (handoff), s09 (skill comparison), s18 (architecture question; cropped 13% at the bottom), s22-60 (commit message; cropped 4.5% at the top), s22-84 (global instructions), s29 (skill resource file), s39 (Smithers GIF), s41 (Ted Lasso GIF), s44-169 (Gemini pushback, Hebrew; cropped 3.5% at the bottom), s44-175 (deck prompt; partly Hebrew).

## 6. How to change slides

The real deck is edited by hand. Never rebuild it as a whole. To change or add a slide:

```powershell
cd C:\Users\moshemoa\ai-developer-toolkit\workshop\deck-src
npm install pptxgenjs --no-save     # node_modules is git-ignored
# 1. Edit or add the slide in build-deck.js, then build to a temp file (the script refuses the real deck)
node build-deck.js $env:TEMP\opencode\deck-build.pptx
# 2. Copy only that slide into the real deck, by its title in the build
.\replace-slides.ps1 -Built $env:TEMP\opencode\deck-build.pptx -Title "Slide title" -At 16 -Mode Replace   # or -Mode Insert
```

Find the right `-At` position by reading the slide titles in the real deck first. If the user edited a slide by hand and asks for a change to it, edit that slide in place through PowerPoint COM rather than replacing it, so their edits survive.

Visual check: export only the affected slides to PNG through PowerPoint COM and inspect them. PowerPoint must be **closed** first: when it is open, the .pptx is locked (EBUSY) and COM fails (CO_E_SERVER_EXEC_FAILURE).

```powershell
$out="$env:TEMP\opencode\deck-render"; New-Item -ItemType Directory -Force $out | Out-Null
$app=New-Object -ComObject PowerPoint.Application
$p=$app.Presentations.Open('C:\Users\moshemoa\ai-developer-toolkit\workshop\agentic-workshop.pptx',$true,$false,$false)
$p.Slides(16).Export("$out\s16.png",'PNG',1600,900); $p.Close(); $app.Quit()
```

LibreOffice and the Python validation libraries are not installed on this machine, so the pptx skill's `validate.py` and `soffice` steps were not used. The last full review found no remaining defects after fixes.

pptxgenjs reminders: no `#` in colours; a fresh options object per call; table cells may take an array of text runs; image cropping uses `sizing: { type: "crop", ... }` (wrapped by `fitImage`).

## 7. Open items

- **Placeholders to fill:**
  - Slide 7: setup command and screenshot.
  - Slide 36: plan-reviewer and a delegation.
  - Slide 54: a non-sensitive Microsoft 365 Copilot screenshot.
  - Slide 59: reset, switch and verify commands, taken from the exercise handout.
  - Slide 61: Trial B demo.
  - Slide 62: the enterprise model list with premium request multipliers.
  - Slide 64: Superpowers demo.
  - Slide 71: Figma API demo.
- **The user filters the slides.** 75 is intentionally more than the 55-minute foundations block can hold; the buzzwords, toolbox and bonus sections can become handouts or optional material.
- **Language:** the deck is English; two kept screenshots contain Hebrew (slides 73–74). A Hebrew version was offered and not yet requested.
- **Exercise alignment:** the trial slides stay generic so they don't reveal the Workload Limit exercise's hidden cases; finalise them once the exercise handout is fixed. The lecture examples deliberately use other domains, such as "archived projects".
- **Facilitator names:** the title slide says "Moshe & Tom"; full names and spelling are unconfirmed.
- **HTML schedule draft:** the brainstorming companion HTML (draft 04, in a temp folder) was not synced with later decisions; the deck and `workshop-plan.md` are the current sources.

## 8. Git state

Pushed to `origin/main` (github.com/Moshe36/ai-developer-toolkit):
- `2b06f95` feat: Add agentic workshop slide deck
- `e597b8b` docs: Add foundations outline and deck to plan

This notes file and `workshop/deck-src/` were added afterwards and are **not committed yet**, unless a later commit says otherwise.
