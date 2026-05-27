---
name: mapping-project-overview
description: Use when creating or refreshing a backend architecture overview from a real codebase, especially when maintaining a project-specific architecture JSON plus a manually curated readable SVG. Relevant for repository mapping, feature-by-feature backend diagrams, architecture drift checks, code-first initial runs, data-first refresh runs, exact visual-style preservation, and cases where uncertainty and implementation gaps must be called out instead of guessed.
---

# Mapping Project Overview

## Overview

Create and refresh a backend architecture overview from evidence, not assumptions.

Keep the maintained artifacts aligned in this strict order:

1. maintained architecture JSON
2. maintained readable overview SVG derived from that JSON
3. project-specific supporting SVGs only if they already exist in that project's maintained contract

The skill must follow the project's maintained format. Do not impose a different schema, visual language, output structure, or asset model just because it is easier to generate.

## Core Rules

- First run is code-first.
- Later runs are data-first.
- Update architecture JSON before touching overview SVG.
- If a maintained readable SVG already exists, inherit its exact visual contract unless the maintained data proves a targeted change is required.
- Never overwrite manually curated coordinates, connector routing, feature grouping, legend structure, or note/gap treatment with generic generated layouts.
- Mark uncertainty explicitly with `status`, `confidence`, or note text.
- Summarize behavior and dependencies; do not dump package trees, folder trees, or class inventories.
- Preserve the maintained hierarchy. If the overview is feature-based, keep it feature-based.
- Prefer meaningful architecture-relevant nodes, but match the maintained detail level when the existing overview is intentionally detailed.
- If evidence is missing, say so in the data and in the rendered panel text.
- If the maintained SVG uses a specific style system, reproduce that exact style system rather than approximating it.

## Run Detection

### First Run

Use when maintained architecture data does not exist yet.

Required order:

1. Read the codebase and existing docs.
2. Infer the architecture model.
3. Write architecture JSON.
4. Generate or update overview SVG from JSON.
5. Create project-specific supporting SVGs only if the maintained architecture contract explicitly requires them.

### Refresh Run

Use when maintained architecture data already exists.

Required order:

1. Read existing architecture JSON first.
2. Read existing readable SVG outputs and any project-specific supporting SVGs second.
3. Read code only to verify drift, additions, removals, and uncertainty.
4. Update architecture JSON.
5. Regenerate or update overview SVG from JSON.
6. Preserve the maintained SVG structure unless a targeted evidence-based change is required.

Before step 5 on refresh runs, verify that the overview SVG path referenced by the maintained architecture JSON is the same SVG file you are about to update. If the paths disagree, fix the JSON first.

On refresh runs, the existing SVG is not just an output artifact. It is also a style and layout contract.

## What To Read

### First Run Read Order

1. Entry points and application bootstrap.
2. Main modules or bounded contexts.
3. API surfaces: REST, GraphQL, messaging, schedulers.
4. Persistence integrations and external services.
5. Existing docs that clarify intent.

### Refresh Run Read Order

1. Maintained architecture JSON.
2. Maintained readable overview SVG and any supporting SVGs already part of the contract.
3. Code areas implicated by stale or missing architecture data.
4. Existing docs only as supporting evidence.

## What To Capture

Capture only architecture-relevant facts:

- primary runtime entry points
- core feature areas or domains, matching the maintained hierarchy
- service boundaries
- major dependencies between features or domains
- datastores, caches, schedulers, and external systems
- cross-cutting concerns that materially affect architecture
- known uncertainty and evidence gaps

When the maintained overview is feature-based, capture per feature:

- feature label and order
- concise feature summary
- verification notes tied to code evidence
- panel height or equivalent layout metadata if maintained in JSON
- typed nodes
- explicit links and link styles
- architecture gaps or schema-only declarations

Do not capture:

- raw package trees
- every class, file, or interface
- generic framework plumbing unless architecturally important
- auto-generated dependency spaghetti
- abstracted high-level domains when the maintained format is intentionally feature-by-feature

## JSON-First Workflow

The JSON is the source of truth for generated overview output.

Always:

1. update facts in JSON first
2. validate hierarchy, relationships, uncertainty markers, and gap annotations
3. generate or revise overview SVG from JSON
4. preserve manual layout conventions unless explicitly updating the affected feature content

If the SVG suggests a change that is not yet represented in JSON, fix the JSON first.

If the JSON references a different overview SVG than the one you are editing, stop and correct the JSON reference before changing any SVG.

If the maintained JSON already uses a project-specific shape, keep that shape. Do not normalize it into a different generic structure.

### Contract Invariants For A Maintained Feature Overview

When a repository already documents its maintained overview contract, treat those repo rules as hard requirements, not suggestions.

For the LRADS-style maintained pattern, preserve these invariants:

- the canonical maintained sources are the architecture JSON and the readable overview SVG referenced by that JSON
- older overview SVGs, alternate diagrams, or generated intermediates are not authoritative once the maintained contract exists
- do not recreate the maintained overview from Mermaid or another alternate DSL when the repo contract forbids it
- preserve and refresh top-level JSON metadata such as `project.scope`, `project.sourceMode`, `project.generatedAt`, and `project.referenceSvg`
- preserve the maintained JSON schema exactly when it already exists; do not reshape `project -> features -> nodes/links/gaps` into another generic model
- `verificationNote` is evidence-backed source material in the JSON; the SVG note card should be a condensed rendering of that evidence, not newly invented prose
- `features[].order` drives panel ordering and badge numbering such as `FEATURE 01`, `FEATURE 02`, and so on
- `panelHeight` is structural layout data; if it changes, keep feature card height, downstream `translate(...)` offsets, and total page height synchronized
- shared services, repos, or mappers may intentionally appear in multiple feature panels; do not deduplicate them into a single abstract global graph unless the maintained contract already does so
- `gaps[]` may need to stay itemized as explicit gap boxes or labels, especially for schema-only declarations; do not collapse them into a generic paragraph note
- preserve the legend exactly as maintained unless the data proves a targeted legend update is required
- reuse the maintained SVG class taxonomy and style tokens exactly when they already exist, for example `panel`, `note`, `gapBox`, `link`, `softLink`, `dashLink`, `ctrl`, `svc`, `repo`, `ext`, and `map`

### Feature-Based Maintained Shape

When the maintained overview is feature-oriented, prefer a shape like:

- `project`
- `features`

Each feature should typically include:

- `id`
- `order`
- `label`
- `summary`
- `verificationNote`
- `panelHeight`
- `nodes`
- `links`
- `gaps`

Each node should typically include:

- `id`
- `label`
- `type`
- `packageOrFile`
- `responsibility`

Each link should typically include:

- `from`
- `to`
- `style`

Common node types:

- `controller`
- `service`
- `repo`
- `mapper`
- `external`

Common link styles:

- `link`
- `softLink`
- `dashLink`

## SVG Rules

### Overview SVG

- May be generated or systematically updated from JSON.
- Must reflect the current JSON, not ad hoc observations.
- Must preserve the project's maintained style, hierarchy, and reading experience.
- Prefer explicit feature panels when the maintained overview is feature-based.
- Prefer legibility over compactness when the maintained overview is intentionally spacious and detailed.

### Exact Maintained Style Contract

If the maintained readable SVG already establishes a style system, treat that style as part of the maintained architecture contract.

For the reference backend overview style, preserve these exact characteristics:

- light page background, including page-level fill or gradient rather than a dark canvas
- one large vertically stacked SVG containing multiple feature panels
- white rounded feature cards with subtle borders and drop shadows
- top header with title and maintained-source subtitle text
- legend block for node categories near the top of the document
- feature badges in the form `FEATURE 0N`
- per-feature title plus concise summary text
- right-side note card labeled `Verified now` or another evidence-aware label already used by the maintained SVG
- typed node styling with distinct pastel fills and strokes for controllers, services, repos, externals, and mappers
- explicit connector routing using preserved `line` and `path` geometry, not generic auto-layout arrows
- divider lines inside panels where the maintained SVG uses them
- gap boxes for unimplemented or schema-only items
- preserved x/y coordinates, grouping, spacing, and connector paths outside the exact feature being changed

The goal is not to create a "similar" SVG. The goal is to update the maintained SVG in the exact same design language.

For the LRADS-style readable overview specifically, also preserve these exact semantics:

- `verificationNote` in JSON maps to the right-side note card text in the readable SVG
- `features[].summary` maps to the per-panel summary line under the feature title
- `features[].order` maps to both vertical panel order and the `FEATURE 0N` badge text
- `features[].gaps` map to explicit gap boxes when that panel already uses them
- repeated shared nodes across feature panels are valid and should remain repeated when the maintained SVG already presents them that way
- if a feature's content change affects height, update the card height, subsequent `translate(...)` values, and outer page height together rather than leaving geometry partially stale

### Project-Specific Supporting SVGs

- Treat supporting SVGs as manual-editable assets only when the maintained project contract explicitly includes them.
- Preserve hand-tuned coordinates, grouping, labels, and annotations.
- If the maintained architecture uses one readable overview SVG with embedded feature panels, preserve that single-file model and edit it in place.
- Do not invent separate panel SVGs or a new asset split if the maintained contract does not already use them.
- Only make minimal targeted edits when the architecture data clearly changed.
- If a section is stale but the right update is unclear, keep it and mark uncertainty rather than redrawing it blindly.

## Uncertainty Policy

When evidence is partial or conflicting:

- mark the node or relationship as uncertain
- include a short reason tied to code evidence
- prefer `unknown` over invented detail
- distinguish observed behavior from inferred behavior

Good values:

- `status: "observed"`
- `status: "inferred"`
- `status: "unknown"`
- `confidence: "high" | "medium" | "low"`

Bad behavior:

- guessing ownership from package names alone
- inferring runtime calls from import graphs alone
- drawing clean dependencies where the code shows ambiguity

## Diagram Quality Bar

Good output:

- stable names aligned to the maintained hierarchy
- feature panels that read like an architecture briefing
- enough node-level detail to explain the real backend flow
- verification notes and gaps tied to evidence
- routed connectors that remain readable after edits

Bad output:

- folder maps disguised as architecture
- dark-theme or generic styling that ignores the maintained SVG contract
- collapsing a maintained feature diagram into a few abstract domains
- random force-directed or generic auto-layout output
- panels that look machine-generated and not curated
- replacing explicit routed connectors with generic straight-line spaghetti

## Recommended Output Shape

Prefer the maintained project shape.

For a maintained contract like LRADS, that means preserving the existing feature-based schema rather than introducing a different generic structure.

If no maintained shape exists yet, a feature-based shape is often a strong default for backend overviews that need readable detail. A good structure is:

- `project`
- `features`

Each feature should carry concise evidence-aware metadata instead of long prose.

## Refresh Checklist

- existing architecture JSON was read before code
- JSON was updated before overview SVG
- maintained SVG style contract was read before editing
- unrelated coordinates and connector routing were preserved
- new or removed features are reflected in JSON
- relationships and link styles match current evidence
- verification notes and gaps are explicit where needed
- uncertainty is explicit
- no package-tree dump leaked into the overview
- overview SVG remains readable, curated, and visually consistent with the maintained reference style

## Red Flags

- rewriting unrelated panel coordinates during a single-feature update
- dropping the maintained architecture data file from the workflow
- replacing explicit nodes and links with package dumps
- swapping a manual maintained layout for generic auto-layout output
- treating the SVG as the primary unit of change
- editing one overview SVG while the maintained JSON points at a different one
- changing a maintained light-theme feature overview into a dark or abstract diagram
- converting a feature-based overview into a domain summary because it feels simpler
- removing verification notes, gaps, legend, or routed connector semantics from the maintained readable SVG

If any of these happen, stop and rebuild from the architecture data file before editing the SVG.

## Common Mistakes

| Mistake | Fix |
|--------|-----|
| Starting refresh from code and ignoring existing data | Read maintained architecture JSON first |
| Editing SVG first because it is visible | Update JSON first, then regenerate or sync SVG |
| Replacing a maintained readable SVG with a generic generated diagram | Preserve the exact visual contract and make minimal targeted edits only |
| Mapping packages instead of architecture | Collapse code details into features and responsibilities that match the maintained hierarchy |
| Replacing feature panels with broad domains | Keep the feature-based structure if that is what the maintained overview uses |
| Approximating the style instead of matching it | Copy the maintained styling system exactly: header, legend, panel cards, note boxes, node classes, gaps, and connector routing semantics |
| Hiding uncertainty to make the diagram cleaner | Mark uncertainty explicitly |

## Minimal Procedure

1. Detect whether architecture JSON exists.
2. If absent, read code first and build JSON.
3. If present, read JSON first, then read the maintained readable SVG to learn its exact hierarchy and visual contract.
4. Use code to verify drift, additions, removals, evidence notes, and gaps.
5. Update JSON.
6. Update overview SVG from JSON while preserving the maintained style exactly.
7. Preserve unrelated coordinates, routing, and grouping.
8. Mark all uncertain nodes, edges, or gaps explicitly.

## Support Files

- `architecture-data-example.json` for a minimal example only
- `svg-panel-template.svg` as a generic shell only

These support files are fallback aids, not a license to override a project's existing maintained format or styling.
