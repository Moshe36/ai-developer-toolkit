---
name: master-hld-generator
description: Generate a code-accurate runtime execution trace and Mermaid sequence-diagram HLD package for a backend microservice, then convert it to an editable Excalidraw scene. Use when asked to produce sequence diagrams, a runtime trace, an HLD, architecture flow documentation, or Excalidraw diagrams for a Java/Spring service, or to refresh existing ones after code changes. Runs discovery and diagram generation in parallel subagents against a frozen contract, validates with a deterministic linter, and gates on real Excalidraw import.
---

# Master HLD Generator — Runtime Trace Mode

## Mission

Generate a **code-accurate Runtime Execution Trace rendered as Mermaid sequence diagrams** for a target microservice.

- The source code is the only source of truth.
- This is a runtime trace, **not** a summary and **not** a simplified overview.
- A new engineer who has never seen the app must understand exactly what happens in every flow: from Client/trigger, through every relevant class, every storage/in-memory/config/external data access, every data object passed between classes, every meaningful return, and every error path.
- **Completeness beats brevity.** Long diagrams are acceptable. Never compress runtime behavior, hide data movement, or summarize several operations into one vague arrow.

Run the pipeline start to finish. Do not ask for approval. Do not stop after discovery. Do not output partial documentation.

## Paths

Every `scripts/...`, `references/...` and `tools/...` path below is relative to **this skill's own directory**, not to the repository being documented. Your working directory during a run is the target repo. Resolve the skill directory once at the start (the skill loader reports it as the base directory) and prefix every script invocation with it.

```
$SKILL = <this skill's directory>
python "$SKILL/scripts/lint_hld.py" ...
node "$SKILL/tools/excalidraw-importer/importer.mjs" ...
```

All `docs/architecture/...` and `.hld-work/...` paths are relative to the **target repository**.

## Deliverables

```
docs/architecture/<service-slug>-sequence-diagrams.md
docs/architecture/<service-slug>-mermaid-only.md    (generated, never hand-written)
docs/architecture/<service-slug>.excalidraw         (or: skipped — <reason>)
```

Working state lives under `docs/architecture/.hld-work/` and is never a deliverable.

## Core rule

For every included flow, in this order: **Discovery → Runtime Trace → Error Trace → Mermaid → Validation.**

Never generate Mermaid before the Runtime Trace is complete. Every Runtime Trace row and every Error Trace row becomes a Mermaid arrow or branch. If any row is missing from Mermaid, the flow fails.

**Mermaid is the visual rendering of the Runtime Trace, not a summary of it.**

## Service detection

Resolve the target service in this priority: explicit `Target service: <name>` → current module/folder name → Maven `artifactId` → Gradle project name → `spring.application.name` → Docker/Compose/Helm service name.

`<service-slug>` is lowercase kebab-case (`CommGroundPlanning` → `comm-ground-planning`).

## Run modes

Decide the mode before phase 1.

| Mode | Trigger | Behavior |
|---|---|---|
| **Full** | `.hld-work/contract.md` absent | Run all phases from scratch. |
| **Resume** | `contract.md` exists, some `flow-notes/*.md` missing | Skip phases 1–2. Dispatch writers only for flows with no `flow-notes` file. Then phases 4–5. |
| **Refresh** | `contract.md` exists and user asks to update after code changes | Re-run phase 1, diff findings against the frozen inventory to detect new/removed flows. Intersect `git diff --name-only <last-run-sha>` with each flow's `sourceFiles` (recorded in its receipt) to find stale flows. Regenerate new + stale flows only. Then phases 4–5. |

`.hld-work/run-state.json` records `{ "sha": "<git rev-parse HEAD>", "mode": "...", "flows": { "<n>": { "slug": "...", "sourceFiles": [...] } } }`. Write it at the end of phase 3.

## Pipeline

### Phase 1 — Discovery (parallel)

Dispatch **4 explorer subagents** concurrently. Each reads `references/discovery.md` and writes findings to `.hld-work/discovery/<axis>.md`.

| Axis | Scope |
|---|---|
| `entrypoints` | Controllers, mappings, schedulers, listeners, runners, lifecycle hooks, health indicators |
| `exceptions` | `throw new`, `orElseThrow`, `catch`, `@ControllerAdvice`, `@ExceptionHandler`, validation annotations |
| `mappers` | `@Mapper` interfaces/classes, DTOs, output construction, which class owns which DTO |
| `data` | Repositories, storage, cache, in-memory state, config/property reads, external clients, parsers/serializers/file IO |

**Overlap is expected and allowed.** A mapper that throws is reported by both `mappers` and `exceptions`. Every finding carries `path/File.java:LINE`; the orchestrator dedupes on that key in phase 2. Explorers must not coordinate with each other.

Each explorer returns a compact receipt only — counts per category and the path of its findings file. Never the full findings.

### Phase 2 — Contract (sequential, orchestrator)

Merge the four findings files. Dedupe on `file:line`. If two explorers make conflicting claims about the same line, reopen **only that file** and resolve it.

Write and **freeze** `.hld-work/contract.md`:

1. **Participant alias registry** — `SVC as OrderService`, one row per class that will ever appear as a participant. Aliases are binding for every writer.
2. **Flow inventory** — number, name, trigger type, entry point, include/exclude, exclusion reason. Numbering is binding.
3. **Exception → handler → outcome map** — which exception is handled where and with what final outcome/status. Writers look this up; they never re-derive it.
4. **Domain glossary** — canonical aggregate/child/DTO names as used in code.
5. **Mapper / DTO ownership table** — which class actually constructs each returned DTO. This makes the ownership gate a lookup instead of N independent investigations.

Inventory rules and valid exclusion reasons: see `references/discovery.md`. Do not proceed to phase 3 until the contract is complete and internally consistent.

### Phase 3 — Generation (parallel)

Batch the included flows by complexity: **simple up to 5 · medium 2–3 · complex 1**. Complexity indicators are in `references/authoring-rules.md`.

Dispatch one writer subagent per batch, concurrently. Each writer is told to read `references/authoring-rules.md`, `references/validation.md`, and `.hld-work/contract.md`, and is given its flow numbers.

Each writer, per flow:

1. Read the cited source files. Build the Runtime Trace table, then the Error Trace table. Every row cites `path/File.java:LINE`.
2. Generate the Mermaid block using the contract's aliases, glossary and ownership table.
3. Write `.hld-work/flow-notes/<n>-<slug>.md`.
4. Run `python "$SKILL/scripts/lint_hld.py" .hld-work/flow-notes/<n>-<slug>.md` and fix every reported violation before returning.

Writers return a **receipt only** — never the diagram:

```json
{ "flow": 3, "slug": "create-order", "rtCount": 14, "erCount": 6,
  "participants": ["Client","API","SVC","Repo","MongoDB","Mapper","GEH"],
  "sourceFiles": ["src/main/java/.../OrderController.java", "..."],
  "contractViolations": [], "gaps": [], "lint": "pass" }
```

The orchestrator must not read diagram bodies into its own context. This is what keeps the main context flat regardless of service size.

If a receipt reports `contractViolations` or `lint != "pass"`, re-dispatch that batch with the violations quoted.

### Phase 4 — Merge and validate (sequential)

1. Assemble `docs/architecture/<service-slug>-sequence-diagrams.md` per `references/output-format.md`, concatenating the flow-notes sections in inventory order.
2. Generate the second file — never write it by hand:
   ```
   python "$SKILL/scripts/extract_mermaid.py" docs/architecture/<slug>-sequence-diagrams.md docs/architecture/<slug>-mermaid-only.md
   ```
3. Lint the merged output:
   ```
   python "$SKILL/scripts/lint_hld.py" docs/architecture/<slug>-sequence-diagrams.md --strict
   ```
4. Run the final rescan (`references/validation.md`, section Q). Fix and repeat until clean.

### Phase 5 — Excalidraw scene

Preflight: require Node ≥ 20. If `$SKILL/tools/excalidraw-importer/node_modules/@excalidraw/mermaid-to-excalidraw/package.json` is absent, run `npm install` in `$SKILL/tools/excalidraw-importer/` (retry with `--registry=https://registry.npmjs.org/` on failure).

```
node "$SKILL/tools/excalidraw-importer/importer.mjs" \
  docs/architecture/<slug>-mermaid-only.md \
  --no-open \
  --expected-count <N> \
  --output docs/architecture/<slug>.excalidraw
```

`--no-open` is mandatory. `--open` blocks until the browser window is closed and will hang the run. `<N>` is the included-flow count, so the importer independently cross-checks the count the QA report claims.

Three failure classes, deliberately different:

| Failure | Meaning | Action |
|---|---|---|
| `Failed to convert diagram N (<heading>) near Markdown line L` | That diagram is genuinely broken | Map the heading back to its flow, regenerate that flow, re-run `extract_mermaid.py` and the linter, retry conversion. Max 2 loops, then record the flow under *Gaps and Questions*. **Blocks completion.** |
| Expected-count mismatch | Inventory and output disagree | Reconcile inventory vs. generated flows. **Blocks completion.** |
| Node missing, or `npm install` fails | The tool cannot run here | Record `Excalidraw scene: skipped (<reason>)` under *Gaps and Questions* and in the final response. **Completes successfully.** The markdown deliverables are unaffected. |

The linter and the importer are both required and catch different things. The linter runs early, per-writer, offline, and enforces semantic rules the importer has no opinion about. The importer runs once and is the only authoritative answer to "does this actually render in Excalidraw". Cheap check first, expensive truth last.

## Judgement rules the linter cannot enforce

These survive as prose because no script can check them. Everything else is in `references/` or in the linter.

1. Never invent a flow, participant, storage operation, data movement, or error that the code does not prove.
2. A repository is not automatically a database. Show `MongoDB`/`SQL`/`Redis` only when the backing store is proven.
3. An `@Entity`/document class is not automatically persisted in this flow. Show persistence only where the code performs it.
4. Never assume errors reach `GlobalExceptionHandler`. Show `GEH` only where code proves it handles that exception.
5. Never fake an HTTP status for a non-HTTP flow. Scheduler, startup, and message flows end at their real runtime outcome.
6. Never collapse code-proven specific causes into a generic one (`MongoTimeoutException` vs `MongoException`, distinct parse failure causes, exact validation field + rule).
7. Never build umbrella or grouped-CRUD diagrams. One endpoint, trigger, or operation is one flow.
8. Never group unrelated operations into one arrow, and never use a vague label where a specific action and data name exist.

## Reference files

| File | Read by | Contents |
|---|---|---|
| `references/discovery.md` | explorer subagents, orchestrator (phase 2) | Search targets per axis, flow inventory rules, exclusion reasons, contract format |
| `references/authoring-rules.md` | writer subagents | Runtime boundary, trace tables, what counts as a row, data naming, all diagram authoring rules with examples |
| `references/validation.md` | writer subagents, orchestrator | Semantic checklist, final rescan, new-engineer quality gate |
| `references/output-format.md` | orchestrator (phase 4) | Final file structure and the final response format |

## Start

Determine the run mode, then begin. Do not stop until the deliverables exist, are synchronized, runtime-trace-complete, data-complete, error-complete, lint-clean, and either converted to Excalidraw or explicitly reported as skipped.
