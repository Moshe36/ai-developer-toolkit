---
name: excalidraw-sequence-diagram
description: Use when creating or extending Excalidraw sequence diagrams for backend service flows, including lifelines, message arrows, flow group containers, note boxes, and color-coded swim lanes.
---

# Excalidraw Sequence Diagram

## Overview

This skill documents the exact Excalidraw JSON structure and visual conventions used in this project's sequence diagrams. All diagrams follow a consistent UML-style sequence layout: lifelines as vertical bars, color-coded flow groups as dashed containers, and arrows with attached labels.

---

## MANDATORY FIELD VALUES

These fields have caused incorrect output. They are not optional — every element must use exactly these values:

| Field | Correct value | Wrong value (never use) |
|---|---|---|
| `fillStyle` | `"solid"` | `"hachure"` |
| `strokeWidth` on arrows | `2` | `1` |
| `strokeWidth` on flow group containers | `1` | any other |
| `strokeWidth` on lifeline bars | `2` | `1` |
| `roughness` | `1` | any other |
| `fontFamily` | `5` | any other |
| `opacity` | `100` | any other |
| `angle` | `0` | any other |
| `elbowed` on regular arrows | `false` | `true` |
| `elbowed` on self-loop arrows | `true` | `false` |

---

## CANONICAL BLOCK ORDER — ENFORCED

Blocks must always appear in this exact top-to-bottom sequence. Never reorder. Never put Error above Mutation. Never put Periodically above Mutation.

```
1. On App start       (orange #f08c00)   — only if feature registers scheduled tasks
2. Mutation / Update  (orange or green)  — only if feature has user-triggered writes
3. Periodically flow  (blue #1971c2)     — only if feature polls an external device
4. Error flow         (red #e03131)      — always last, always present if any error paths exist
```

Skip a block entirely if it does not apply. The remaining blocks still follow this order.

---

## Coordinate System

- Origin is top-left. Positive x goes right, positive y goes down.
- **Lifelines are spaced ~190px apart** horizontally.
- **Messages (rows) are spaced ~40px apart** vertically within a block.
- **Gap between blocks: 80px minimum.** If a block contains long arrow labels or multi-line text, increase to 100px. Never place the next block's first arrow closer than 80px below the previous block's last arrow — the label above the arrow needs room.
- Each flow group container starts 40px above its first arrow row (space for the group label).
- Left edge of diagram: x ≈ -220. Diagram width scales with participant count — use the x position formula; there is no fixed right boundary.

### Vertical Spacing Budget Per Block

```
group_start_y  = previous_group_end_y + 80          // 80px gap between blocks
first_row_y    = group_start_y + 40                  // 40px for the group label
next_row_y     = previous_row_y + 40                 // 40px per message row
group_end_y    = last_row_y + 20                     // 20px padding at bottom
group_height   = group_end_y - group_start_y
```

If any arrow label wraps to multiple lines, add 20px extra to that row's spacing and expand `group_height` accordingly.

---

## Element Array Order (Z-Order)

Excalidraw uses **two** mechanisms for render order — both must be correct:

1. **Array position**: elements later in the `elements` array render on top.
2. **`index` field**: a fractional-index string (`"a0"`, `"a1"`, `"b0"`…) that also controls z-order. Higher string value = rendered on top.

Lifeline bars have a solid `#e9ecef` fill. Any arrow with a lower `index` than a bar will be painted over and become invisible — only appearing after a double-click.

**Required array order AND index order:**

```
Position  index range   Elements
────────  ───────────   ─────────────────────────────────────────────
1–2       a0–a1         Diagram title + description texts
3–N       a2–aN         Lifeline label texts  (one per participant)
N+1–M     b0–bM         Lifeline bar rectangles  (one per participant)
M+1–P     c0–cP         Flow group containers  (dashed rectangles)
P+1–Q     d0–dQ         Flow group label texts
Q+1–R     e0–eR         Arrows  (ALL arrows — forward + return)
R+1–S     f0–fS         Arrow label texts  (containerId-bound)
S+1–T     g0–gT         Note box rectangles  (if any)
T+1–U     h0–hU         Note box texts  (if any)
```

Assign `index` values in strict ascending order following this table. **Arrows must have higher `index` values than all lifeline bars.** Never give an arrow an `index` below `"e0"`.

**Never place arrows before lifeline bars in the array, and never give them a lower `index`.**

---

## Element Catalog

> **Every participant requires exactly TWO elements: one Lifeline Bar (rectangle) + one Lifeline Label (text). Generating only the label without the bar is the most common error — the bar is what draws the vertical line. Both must be present.**

### 0. Diagram Title

Every diagram must have a title block above the lifeline headers. It consists of two text elements: a title and a description.

**Title text** (`fontSize: 28`):
```json
{
  "type": "text",
  "x": -220,
  "y": <top_of_diagram>,
  "fontSize": 28,
  "fontFamily": 5,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "textAlign": "left",
  "verticalAlign": "top",
  "containerId": null
}
```

**Description text** (`fontSize: 16`, placed 36px below the title):
```json
{
  "type": "text",
  "x": -220,
  "y": <title_y + 36>,
  "fontSize": 16,
  "fontFamily": 5,
  "strokeColor": "#868e96",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "textAlign": "left",
  "verticalAlign": "top",
  "containerId": null
}
```

- Title: the feature or operation name (e.g. `"Delete Logs"`, `"setTcgState (enable / disable)"`)
- Description: one sentence explaining what the diagram shows (e.g. `"Covers EMS and Radio file deletion, including audit logging and error propagation."`)
- Lifeline labels start below the description — leave at least 20px gap between description bottom and lifeline label top

### 1. Lifeline Bar

A thin vertical rectangle representing a participant. **This is the vertical line you see in sequence diagrams. It is mandatory. Do not skip it.**

```json
{
  "type": "rectangle",
  "x": <center_x - 17>,
  "y": <header_bottom_y>,
  "width": 35,
  "height": <total_diagram_height>,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "#e9ecef",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": { "type": 3 },
  "boundElements": [],
  "link": null,
  "locked": false
}
```

- One rectangle per participant — **if you have 6 participants, you need 6 bar rectangles**
- `height` must span from `header_bottom_y` to the bottom of the last flow group plus 40px
- External system participants use `strokeColor: "#1971c2"` on the bar

### 2. Lifeline Label

Text placed above the lifeline bar.

```json
{
  "type": "text",
  "x": <center_x - (width/2)>,
  "y": <header_top_y>,
  "fontSize": 20,
  "fontFamily": 5,
  "strokeColor": "#1e1e1e",
  "textAlign": "left",
  "verticalAlign": "top"
}
```

- External system lifelines use `strokeColor: "#1971c2"` (blue) to indicate external boundary
- Dual-role actors (participants that appear in both normal and error flows) use `backgroundColor: "#ffc9c9"` (pink) on their label text to flag the dual role

### 3. Flow Group Container

A dashed rectangle that groups semantically related messages.

```json
{
  "type": "rectangle",
  "x": -220,
  "y": <group_start_y>,
  "width": 1590,
  "height": <group_height>,
  "strokeColor": "<group_color>",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "dashed",
  "roughness": 1,
  "roundness": null
}
```

Paired with a label:

```json
{
  "type": "text",
  "x": -210,
  "y": <group_start_y + 5>,
  "fontSize": 20,
  "fontFamily": 5,
  "strokeColor": "<group_color>",
  "textAlign": "left"
}
```

### 4. Message Arrow (forward call)

```json
{
  "type": "arrow",
  "x": <from_center_x + 17>,
  "y": <row_y>,
  "width": <to_center_x - from_center_x - 34>,
  "height": 0,
  "angle": 0,
  "strokeColor": "<message_color>",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": { "type": 2 },
  "boundElements": [{ "id": "<label_id>", "type": "text" }],
  "link": null,
  "locked": false,
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "elbowed": false,
  "points": [[0, 0], [<to_center_x - from_center_x - 34>, 0]]
}
```

**Arrow width formula** (adjacent participants, 190px spacing):
```
width = 190 - 34 = 156
```
For non-adjacent participants (skipping N lifelines):
```
width = (N × 190) - 34
```

- When the arrow label crosses another element, set `backgroundColor: "#ffffff"` on both the arrow and its label

### 5. Return Arrow

Same structure, but `x` starts at the far participant and `points` go negative:

```json
{
  "x": <to_center_x + 17>,
  "width": <same as forward>,
  "points": [[0, 0], [-(to_center_x - from_center_x - 34), 0]]
}
```

- **ACK / void returns**: `strokeStyle: "solid"`, `strokeColor: "#868e96"` (grey)
- **DTO / data payload returns**: `strokeStyle: "dashed"`, `strokeColor: "#868e96"` (grey)
- Label text: "ACK", "DataDto", entity name, or return value

### 6. Arrow Label

Always bound to its arrow via `containerId`.

```json
{
  "type": "text",
  "x": <arrow_center_x - width/2>,
  "y": <arrow_y - 18>,
  "fontSize": 16,
  "fontFamily": 5,
  "strokeColor": "<same as arrow>",
  "backgroundColor": "transparent",
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "<arrow_id>"
}
```

- Use `fontSize: 13` for dense labels that must fit in a narrow space (multi-line note-style content)
- When the label crosses another element, set `backgroundColor: "#ffffff"` to mask the overlap

### 7. Self-referencing Loop Arrow

Used for `evaluate()`, startup registration calls (`startScheduledTasks`), or any other call that originates and terminates on the same lifeline. An elbowed arrow that leaves the lifeline bar right, loops down, and returns to it.

```json
{
  "type": "arrow",
  "elbowed": true,
  "roundness": null,
  "points": [
    [0, 0],
    [42, 0],
    [42, <loop_height>],
    [0, <loop_height>]
  ]
}
```

**Rule:** Any arrow whose source and target are the same lifeline must use `"elbowed": true` with a 4-point path.

### 8. Note Box (implementation detail)

Yellow box with small text, placed to the right of the lifeline area it annotates.

```json
{
  "type": "rectangle",
  "backgroundColor": "#fff9db",
  "strokeColor": "#1e1e1e",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roundness": { "type": 3 }
}
```

State-change notes use light purple:

```json
{ "backgroundColor": "#e5dbff" }
```

### 9. Vertical Separator Line

Dotted blue vertical line used to divide diagram sections.

```json
{
  "type": "line",
  "strokeColor": "#1971c2",
  "strokeStyle": "dotted",
  "strokeWidth": 2,
  "roundness": { "type": 2 }
}
```

---

## Color Convention

| Color | Hex | Usage |
|---|---|---|
| Black | `#1e1e1e` | Standard call arrows, lifelines, labels |
| Grey | `#868e96` | Return arrows, ACKs, response messages |
| Orange | `#f08c00` | App startup/initialization flows **and** update/patch command flows |
| Green | `#2f9e44` | Mutation / write flows |
| Blue | `#1971c2` | Polling, scheduler, periodic flows; external lifelines |
| Purple | `#7048e8` | Cleanup, ACK path, TTL flows |
| Red | `#e03131` | Error flows; auth-authorized forwarded calls; error flow group containers |

### Background Color Modifiers

| Color | Hex | Usage |
|---|---|---|
| Pink | `#ffc9c9` | `backgroundColor` on a lifeline label or actor text — marks a **dual-role actor** (participant appears in both normal and error flows) |
| White | `#ffffff` | `backgroundColor` on an arrow or arrow label — **readability mask** when the element visually crosses another element |

---

## Font Size Tiers

| Element | `fontSize` |
|---|---|
| Lifeline label | `20` |
| Flow group label | `20` |
| Arrow / message label | `16` |
| Dense / note-style label (multi-line, narrow space) | `13` |
| Section or diagram title | `24`–`28` |

Always `fontFamily: 5` for every text element.

---

## Participant Naming Conventions

| Role | Naming Pattern | Example |
|---|---|---|
| Frontend client | `CLIENT` | CLIENT |
| Auth middleware | `AuthFilter` | AuthFilter |
| REST controller | `<Domain>Controller` | MissionController |
| Domain service | `<Domain>Service` | MissionService |
| Scheduler wrapper | `<Domain>ServiceScheduler` | MissionServiceScheduler |
| Operation state mgr | `OpStateService` | OpStateService |
| External device/system | `<Device>` or `<Protocol>` | RadioDevice, BNET |
| HTTP client | `<Domain>Client` | radioClient |
| Repository | `<Domain>Repo` | MissionRepo |
| File service | `fileService` | fileService |
| Audit log | `auditLog` | auditLog |

---

## Standard Flow Patterns

### Mutation Flow (green)

```
CLIENT → AuthFilter: mutation request
AuthFilter → Controller: authorized request  [red arrow]
Controller → Service: updateField(value)
Service → OpStateService: hasActiveOperation()
OpStateService → Service: false / null  [grey return]
Service → RadioDevice: HTTP POST /endpoint
RadioDevice → Service: ACK  [grey]
Service → OpStateService: start(OpCtx<T>(IN_PROGRESS, pred, supplier))
OpStateService → Service: ACK  [grey]
Service → Controller: ACK  [grey]
Controller → AuthFilter: ACK  [grey]
AuthFilter → CLIENT: ACK (show spinner)  [grey]
```

### Scheduler / Polling Flow (blue, looped)

```
EntityServiceScheduler → RadioDevice: HTTP GET /Data
RadioDevice → EntityServiceScheduler: DataDto  [grey]
EntityServiceScheduler → EntityRepo: save Entity data
OpStateService self-loop: evaluate()
  Note: supplier.get() → pred.test(state)
  Note: if TRUE → state = SUCCESS, completedAt = now()
  Note: if timeout → state = FAILED, completedAt = now()
```

### Periodic Query Flow (blue)

```
CLIENT → AuthFilter: query stationStatus
AuthFilter → Controller: fetch Data
Controller → Service: get Data
Service → Repo: get Entity
Repo → Service: Entity  [grey]
Service → OpStateService: get()
OpStateService → Service: OperationState or null  [grey]
Service → Controller: Entity + operationState  [grey]
Controller → CLIENT: Data (with operationState)  [grey]
```

### Cleanup Flow (purple)

**ACK path:**
```
CLIENT → Service: acknowledgeOperation()
Service → OpStateService: acknowledge()
  Note: context = null  [purple box]
```

**TTL path (auto):**
```
Scheduler → OpStateService: evaluate()
  Note: completedAt + ttlMs < now() → context = null  [purple box]
```

### Error Flow (red)

```
RadioDevice → CLIENT: re-throw → stop() + systemState = NOT_CONNECTED
```

---

## Component Architecture

Understanding what each participant does tells you **which participants to include** for any new feature. Include a component if and only if the feature's code path passes through it.

### Participants and Their Roles

Two participants are **non-negotiable** and must never be omitted when their condition is met:

> **`AuthFilter` is mandatory in every diagram where CLIENT makes any HTTP request.** No exceptions. Every request from CLIENT enters the system through AuthFilter before reaching any controller.
>
> **`auditLog` is mandatory in every diagram where the feature performs any write, update, or delete operation.** If the feature mutates state, there is an audit trail. Omitting it means the diagram is wrong.

| Participant | Role | Include when |
|---|---|---|
| `CLIENT` | Frontend — initiates all user-driven requests | Feature has any user-triggered action |
| `AuthFilter` ⚠️ | Security gate — validates JWT, rejects unauthorized requests | **Any CLIENT HTTP request — mandatory, no exceptions** |
| `<Domain>Controller` | REST entry point — delegates to Service, returns HTTP response | Feature exposes an HTTP endpoint |
| `<Domain>Service` | Domain logic — orchestrates the operation | Almost always |
| `OpStateService` | Generic async-operation tracker — `IN_PROGRESS → SUCCESS/FAILED` | Feature has an async hardware operation |
| `<Domain>ServiceScheduler` | Domain wrapper around Scheduler — owns the polling loop | Feature polls a device on a timer |
| `Scheduler` | Spring scheduler — fires registered tasks | Feature polls a device on a timer |
| `<Device>` / external system | External hardware or system (RadioDevice, BNET, etc.) | Feature communicates with hardware |
| `<Domain>Repo` | Database repository | Feature reads or writes persisted data |
| `fileService` | Saves files to disk | Feature involves file I/O |
| `auditLog` ⚠️ | Writes audit trail entries | **Any write / update / delete operation — mandatory, no exceptions** |
| `radioClient` / `<Domain>Client` | HTTP client wrapper over external system | Feature uses a client abstraction layer |

**External system lifelines** (devices, BNET, etc.) use `strokeColor: "#1971c2"` (blue) on their lifeline bar and label to signal the external boundary. Each external system gets its own lifeline.

---

### OpStateService in Detail

`OpStateService` is a **generic tracker** — it does not know about radio or TCG specifics. Each domain entity provides an `EntityOperationContext` implementation with:

- **`supplier`** — fetches the current state from the device (e.g. HTTP GET to RadioDevice)
- **`predicate`** — tests whether the returned state means the operation completed (e.g. `systemMode == target`)

In diagrams, always write `OpStateService` — never the concrete `EntityOperationContext`. The context is an implementation detail, not a participant.

**State machine:**
```
start(OpCtx<T>(IN_PROGRESS, pred, supplier))
  → scheduler calls evaluate() on each tick
    → supplier.get() → pred.test(state)
      → TRUE  : state = SUCCESS, completedAt = now()
      → timeout: state = FAILED,  completedAt = now()
      → FALSE : stays IN_PROGRESS
```

---

### The AuthFilter Contract

- **Every** CLIENT-initiated request (read or write) passes through `AuthFilter`.
- The arrow from `CLIENT → AuthFilter` is always **black** (standard call).
- The arrow from `AuthFilter → Controller` is always **red** (`#e03131`) — signaling the request is now authorized and entering the domain.

---

## Deciding Which Flows to Include

Use this checklist for every new feature diagram:

| Question | If YES → include this flow |
|---|---|
| Does the feature write/command something? | **Mutation flow** (green) |
| Does the mutation send a command to external hardware with an async completion condition? | **+ OpStateService** in mutation flow + **Cleanup flow** (purple) |
| Does the feature poll an external device on a timer to sync state? | **App startup flow** (orange) + **Scheduler/polling flow** (blue loop) |
| Does the client query the current entity state (including operation status)? | **Periodic query flow** (blue) |
| Can the external device call fail with a connectivity error? | **Error flow** (red) |

**Only draw the lifelines that participate in the feature.** Include every component the feature actually touches; omit every one it does not. There is no fixed participant count — a simple CRUD feature may need 4 lifelines, a hardware-polling feature may need 9 or more.

---

## One Diagram or Many?

When a plan covers multiple operations, decide up front how many diagrams to produce.

### Split into separate diagrams when:
- Two operations involve a **meaningfully different set of components** (e.g. Create touches `fileService` and `OpStateService`; Delete does not — different lifeline sets → different diagrams)
- Two operations follow **different flow structures** (e.g. one is fire-and-forget, the other is async with polling)
- A single diagram would become too wide or too tall to read comfortably

### Consolidate into one diagram when:
- Two or more operations are **structurally identical** — same participants, same flow shape, same block sequence — and differ only in the operation name or the specific field/entity being acted on
- In that case, name the operation generically (e.g. `XOperation`, `updateField`) and list the concrete operations it represents in the diagram title

**Title format for consolidated diagrams:**
```
XOperation  (covers: createX, updateX, patchX)
```

Place this title as a large text element (`fontSize: 24–28`) above the lifeline headers.

### Decision rule in plain terms:
> If you would have to draw different arrows or different lifelines, draw separate diagrams.  
> If you would only have to change a label, consolidate into one.

### Examples:

| Scenario | Decision |
|---|---|
| Create mission vs Delete mission — Create saves a file, Delete does not | **Two diagrams** |
| Set radio frequency vs Set radio power — both go CLIENT → AuthFilter → Controller → Service → RadioDevice → Repo, same shape | **One diagram** — name it `updateRadioParameter` |
| Fetch station status vs Fetch mission status — different Repos, different external devices | **Two diagrams** |
| Enable TCG vs Disable TCG — same components, inverse command value | **One diagram** — name it `setTcgState (covers: enable, disable)` |

---

## Canonical Block Order

Every diagram follows this fixed top-to-bottom block sequence. Each block is one flow group container.

| # | Block | Color | What it shows |
|---|---|---|---|
| 1 | **On App start** | Orange `#f08c00` | Initialization: services register scheduled tasks with the Scheduler (self-referencing elbowed arrows) |
| 2 | **Mutation / Update flow** | Orange `#f08c00` or Green `#2f9e44` | Frontend → Backend request path: CLIENT → AuthFilter → Controller → Service → (OpStateService, DB, external device) → response back to CLIENT |
| 3 | **Periodically flow** | Blue `#1971c2` | Backend → External source polling: Scheduler fires, Service fetches from device (Radio, TCG, BNET, etc.), saves result to Repo |
| 4 | **Error flow** | Red `#e03131` | All error scenarios: auth failures, device connectivity errors, file save failures — always the last block |

**Rules:**
- Never reorder these blocks. Readers expect top = init, bottom = errors.
- The Error block is always last, even if it contains multiple error sub-paths.
- If a feature has no mutation (read-only), skip block 2 but keep block order for remaining blocks.

---

## Generating a New Diagram

1. **Identify participants** — list only the components the feature's code path actually touches, left to right in call order.
2. **Assign x positions** — space participants 190px apart. Start the leftmost at center x = -190.
3. **Draw lifeline bars** — one tall rectangle per participant, starting below headers. Set `height` to span all flow groups plus 40px margin.
4. **Label lifelines** — text above each bar.
5. **Define flow groups** — one dashed container per block (see Canonical Block Order). Label in group color, top-left.
6. **Add messages row by row** — each arrow + label pair, 40px vertical spacing.
7. **Add return arrows** — dashed grey for DTO/data payloads, solid grey for ACKs.
8. **Add note boxes** for internal logic details (yellow) or state effects (purple).
9. **Add self-loops** (`elbowed: true`) for any call that originates and returns to the same lifeline.
10. **Add separator lines** between major sections if needed.

### X Position Formula

```
center_x(n) = -190 + (n × 190)    // n = 0-based participant index
bar_left_x(n) = center_x(n) - 17
```

**Example — 5 participants:**

| # | Participant | Center X | Bar left X |
|---|---|---|---|
| 0 | CLIENT | -190 | -207 |
| 1 | AuthFilter | 0 | -17 |
| 2 | Controller | 190 | 172 |
| 3 | Service | 380 | 362 |
| 4 | Repo | 570 | 552 |

Add more columns by continuing the formula. The diagram width grows with participant count — there is no fixed maximum.

---

## Working Vertically — One Diagram at a Time

When a plan requires multiple diagrams, never generate all of them in a single pass. A full JSON payload for even one diagram is large; generating several in sequence exhausts context and degrades quality.

### Preferred approach: parallel sub-agents

Dispatch one sub-agent per diagram. Each agent receives:
- The relevant feature description
- The participant list for that diagram
- The flows it must include (from the "One Diagram or Many?" decision)

Sub-agents work simultaneously and return their JSON independently. This is the fastest path and keeps each agent's context focused on a single diagram.

### Fallback: sequential flush

If sub-agents are not available, generate and **fully output** one diagram before starting the next:

1. Decide all diagrams upfront — list them by name before writing any JSON
2. Generate diagram 1 completely — write the full `.excalidraw` JSON to file
3. Confirm diagram 1 is written and correct
4. Move to diagram 2 — repeat

**Never hold two diagrams in context at once.** Complete and flush each file before the next one begins.

### Planning step (always first)

Before writing any JSON, output a diagram plan:

```
Diagrams to generate:
1. <FeatureName> — participants: CLIENT, AuthFilter, ..., Repo — flows: Mutation, Error
2. <FeatureName> — participants: Scheduler, Service, ..., Device — flows: App start, Periodically, Error
...
```

This makes the scope visible, lets the user correct the plan before any JSON is written, and gives sub-agents a clear brief.

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| **Arrows invisible until double-clicked** | Both the array position AND the `index` field are wrong. Arrows must appear after all lifeline bars in the array AND have a higher `index` value (use `e0`+ for arrows, `b0`+ for bars). |
| **`AuthFilter` missing** | AuthFilter is mandatory whenever CLIENT makes any HTTP request. Never omit it. |
| **`auditLog` missing** | auditLog is mandatory whenever the feature performs any write, update, or delete. Never omit it. |
| **`fillStyle: "hachure"`** | Always `"fillStyle": "solid"` on every element — arrows, text, rectangles |
| **`strokeWidth: 1` on arrows** | Arrows must use `strokeWidth: 2`. Only flow group containers use `strokeWidth: 1` |
| Arrow label not bound to arrow | Set `containerId` on text and `boundElements` on arrow |
| Return arrow going right | `x` must start at the far participant; `points` must be `[[0,0],[-width,0]]` |
| Self-loop not elbowed | Set `"elbowed": true` and use 4-point path |
| Note box overlaps lifeline | Place note boxes to the right of all lifeline bars |
| Mixed `roughness` values | Always `roughness: 1` |
| Wrong font | Always `fontFamily: 5` |
| Flow container covers wrong rows | The container `y` starts 40px above the first row in the block (for the label). `height` = last_row_y - group_start_y + 60px |
| No diagram title or description | Every diagram needs a title (`fontSize: 28`) and a one-sentence description (`fontSize: 16`, grey) above the lifeline headers |
| Blocks too close together — arrow labels clipped | Minimum 80px gap between the last arrow of one block and the first arrow of the next. Flow group container starts 40px above the first arrow to fit the group label. |
| Block order wrong | On App start → Mutation/Update → Periodically → Error. Never deviate. |
