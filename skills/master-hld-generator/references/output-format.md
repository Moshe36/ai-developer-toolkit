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

### 1. <Flow Name>

**Trigger / Entry Point:** ...
**Purpose:** ...
**Runtime Boundary:** ...
**Participants:** ...
**Primary Runtime/Data Movement:** ...
**Storage / In-Memory / Config / External Data:** ...
**Errors Covered:** ER-01 ..., ER-02 ...

#### Mermaid Sequence Diagram

(one mermaid block)

#### Notes

Concise notes only: important runtime behavior, data movement, gaps, or intentional omissions.

### 2. <Flow Name>
...

## 7. Coverage Summary
## 8. Gaps and Questions
## 9. Final QA Report
```

Sections 3 and 4 are compact tables taken from the frozen contract inventory. Section 5 is a numbered index of included flows.

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
