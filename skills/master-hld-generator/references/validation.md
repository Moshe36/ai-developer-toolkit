# Validation

The linter owns every mechanically decidable rule. This file contains only what a script cannot decide.

## Division of labour

| Check | Owner |
|---|---|
| Balanced `alt`/`else`/`loop`/`opt`/`par`/`end`, closed fences | `lint_hld.py` |
| Undeclared participants | `lint_hld.py` |
| Arrow tokens inside labels and note text | `lint_hld.py` |
| Error branch missing its `Note right of` title note | `lint_hld.py` |
| `Note over` used outside the two section titles | `lint_hld.py` |
| Generic or bare-ID title notes | `lint_hld.py` |
| Failed-alternative wording in Happy-path labels | `lint_hld.py` |
| RT/ER IDs in the trace but absent from the diagram | `lint_hld.py` |
| Missing or malformed `file:line` evidence | `lint_hld.py` |
| Java method signatures in labels | `lint_hld.py` |
| Happy path before Error scenarios | `lint_hld.py` |
| The two output files carrying identical Mermaid | `extract_mermaid.py` (structurally) |
| Does it actually render in Excalidraw | phase 5 importer |
| Everything below | you |

Run the linter first. Then judge the rest.

---

## Semantic checklist — per flow

**Coverage and data movement**

- [ ] Every cross-class call in the flow appears as an arrow
- [ ] Every required same-class step appears as a real `X->>X:` self-arrow
- [ ] Every DB/storage read shows request *and* return; every write shows written data *and* result or ack
- [ ] Every behavior-affecting in-memory, config, or cache access is shown
- [ ] Every meaningful data object passed between classes is named
- [ ] Output construction is shown once, not duplicated
- [ ] An HTTP flow returns to Client; a non-HTTP flow reaches a real final outcome, not a fabricated HTTP status
- [ ] No real chain was collapsed into a shorter one

**Labels**

- [ ] Labels name real domain objects and lookup keys from the contract glossary
- [ ] No vague labels (`resolve from aggregate`, `validate`, `build response`, `update entity`, `get data`)
- [ ] No label carries two actions; long labels were split rather than truncated
- [ ] Removing failure wording from the Happy path did not remove any successful runtime detail
- [ ] No low-value `Optional` unwrap / presence / null-check success arrows

**Mapper ownership**

- [ ] Every mapper entered at runtime appears as a participant with a call arrow and a return arrow, including pure field-copy mappers
- [ ] The contract ownership table was consulted for every returned DTO
- [ ] No `API->>API: build XxxDto` or `SVC->>SVC: build XxxDto` where a mapper creates `XxxDto`
- [ ] Non-trivial mapper work is shown as mapper self-arrows or outgoing calls; pure field-copy mappers show only call and return
- [ ] Mapper arrow labels describe behavior, never method names

**Errors**

- [ ] Every reachable `throw new`, `orElseThrow`, and `catch` in the flow is an ER row or a documented exclusion
- [ ] Each title note describes the real scenario in domain terms, not a generic word
- [ ] Each title note is anchored to the participant that actually detects the failure
- [ ] Each branch names the exact condition, exception or outcome, handling, and final outcome
- [ ] Grouped branches name all their ER IDs and exact error names in both the label and the title note
- [ ] Code-proven specific causes were preserved, not merged (`MongoTimeoutException` vs `MongoException`, distinct parse causes, exact validation field and rule)
- [ ] Response body details are preserved, including empty body
- [ ] `GEH` appears only where the contract's exception map proves it handles that exception

**Evidence**

- [ ] Every RT and ER row cites `path/File.java:LINE`
- [ ] Every cited file and line actually exists and contains what the row claims

If any check fails: reopen the source, fix the Runtime or Error Trace, regenerate the Mermaid, re-lint, revalidate. Do not return a flow that fails a check.

---

## Final rescan (orchestrator, phase 4)

After all flows are merged, rescan the code and compare against the contract, the flow notes, and both final files.

Scan: controller mappings · non-HTTP triggers · public service methods · meaningful private helpers · cross-class calls · `throw new` / `orElseThrow` / `catch` · validation annotations · repository and storage calls · in-memory and config usage · external calls · parser/serializer/file operations · output construction · exception handlers.

| Area | Missing Items Found? | Action Taken |
| ---- | -------------------- | ------------ |
| Entry points | | |
| Runtime calls | | |
| Data movement | | |
| DB/storage operations | | |
| In-memory/config/cache operations | | |
| Output construction | | |
| Mapper participation | | |
| Errors | | |
| Handlers | | |

If missing items are found: update the affected flow notes, re-run `extract_mermaid.py`, re-lint, update both final files, and rerun the rescan. Do not finish with known missing items unless they are documented as a real gap in section 8.

---

## New-engineer quality gate

For every flow, the final package must make all of the following clear. If any is unclear, fix the diagram or the notes — not by adding prose that compensates for a bad diagram.

What triggers the flow · what input enters · which component receives it first · what classes it passes through · what data moves between classes · what is loaded from DB or storage · what is read from in-memory, config, or cache · what data changes · what external calls happen · how output is built · what is returned · where it can fail · how each failure is handled · the final outcome of each failure.

Data, storage, in-memory, and external items may be "not applicable" when they are genuinely absent from the flow. Everything else must be answerable from the diagram alone.
