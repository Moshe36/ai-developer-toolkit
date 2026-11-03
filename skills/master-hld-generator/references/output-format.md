# Output Format

Read by the orchestrator in phase 4.

## `docs/architecture/<service-slug>-sequence-diagrams.md`

```markdown
# <Service Name> Runtime Sequence Diagrams Package

## 1. Service Responsibility
## 2. Analysis Scope
## 3. Flow Inventory
## 4. Excluded Candidates
## 5. Detected Processes Index
## 6. Detailed Runtime Processes

### Orders

**Feature purpose:** ...
**Aggregate / resource owned:** Order

**Flows in this feature**

| # | Flow | Trigger | How it differs from its siblings |
| - | ---- | ------- | -------------------------------- |
| 1 | Create Order | HTTP POST /orders | only flow that assigns an order reference |
| 2 | Update Order | HTTP PUT /orders/{id} | only flow that acquires the aggregate lock |
| 3 | Get Order By Id | HTTP GET /orders/{id} | read-only, no mutation |

**Shared participants and storage:** API, SVC, OrderRepository, MongoDB, OrderMapper — every flow loads or writes the Order document.

**Shared vs. divergent behavior:** all three resolve the Order aggregate by id and map through OrderMapper. Only Update acquires the lock; only Create assigns a reference; only Get skips persistence entirely.

**Errors across this feature:** ER-01 invalid JSON body (flow 1) · ER-02 duplicate reference (flow 1) · ER-03 Order not found (flows 2, 3) · ER-04 lock held by another owner (flow 2)

#### 1. Create Order

**Trigger / Entry Point:** ...
**Purpose:** ...
**Runtime Boundary:** ...
**Participants:** ...
**Primary Runtime/Data Movement:** ...
**Storage / In-Memory / Config / External Data:** ...
**Errors Covered:** ER-01 ..., ER-02 ...

##### Mermaid Sequence Diagram

(one mermaid block)

##### Notes

Concise notes only: important runtime behavior, data movement, gaps, or intentional omissions.

#### 2. Update Order
...

### Audit Logging

...

## 7. Coverage Summary
## 8. Gaps and Questions
## 9. Final QA Report
```

### Feature grouping

Section 6 is organised by the feature groups frozen in the contract, in contract order. Flow numbers run 1..N straight through, so every group's flows are contiguous.

Each feature section carries, above its flows: the feature purpose and the aggregate it owns · a table of its flows and how each differs from its siblings · the participants and storage they share · what is shared versus divergent across them · the errors across the whole feature.

**A feature holding exactly one flow gets no group heading.** That flow is rendered directly as `### <n>. <Flow Name>` with its diagram at `#### Mermaid Sequence Diagram`, exactly as an ungrouped flow. Do not wrap a single flow in a feature section.

Grouping is presentation only. It never merges flows, never produces an umbrella diagram, and never alters a diagram's content — one entry point remains one flow with one runtime trace.

Sections 3 and 4 are compact tables taken from the frozen contract inventory. Section 3 includes the group column. Section 5 is a numbered index of included flows, grouped by feature.

Do not dump internal Runtime Trace or Error Trace tables into this file unless a table is genuinely needed to explain an ambiguity. **The Mermaid diagram is the trace**; `.hld-work/flow-notes/` holds the detail.

Flow numbering and titles must match the frozen contract exactly.

Section 8 records real gaps, unresolved ambiguities, and — when applicable — `Excalidraw scene: skipped (<reason>)`.

## `docs/architecture/<service-slug>-mermaid-only.md`

**Never write this file by hand.** Generate it:

```
python "$SKILL/scripts/extract_mermaid.py" \
  docs/architecture/<slug>-sequence-diagrams.md \
  docs/architecture/<slug>-mermaid-only.md
```

Output shape:

```markdown
# <Service Name> Mermaid Runtime Sequence Diagrams

## 1. <Flow Name>

(one mermaid block)

## 2. <Flow Name>

(one mermaid block)
```

Minimal headings, numbered per flow, one Mermaid block per flow, content byte-identical to the sequence file, no tables, no commentary.

This file stays **flat** — no feature headings. Because flow numbers are contiguous within a group, a feature's diagrams are already adjacent, and the importer uses each heading as its diagram title.

## `docs/architecture/<service-slug>.excalidraw`

Produced by phase 5. Either present, or explicitly reported as skipped with a reason.

## Final response

After the pipeline completes, respond with only this:

```text
Created files:

1. docs/architecture/<service-slug>-sequence-diagrams.md
2. docs/architecture/<service-slug>-mermaid-only.md
3. docs/architecture/<service-slug>.excalidraw

Summary:

- Target service: <Service Name>
- Target service slug: <service-slug>
- Run mode: full / resume / refresh
- Flow candidates discovered: <number>
- Included diagrams generated: <number>
- Excluded candidates: <number>
- Lint status: pass
- Excalidraw scene: created / skipped (<reason>)
- QA status: passed / needs review
- Unresolved assumptions: <none or list>
```

No extra commentary. If the Excalidraw scene was skipped, drop line 3 from the file list and state the reason on the summary line.
