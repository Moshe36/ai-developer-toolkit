---
name: excalidraw-sequence-diagram
description: Use when creating or extending Excalidraw sequence diagrams for backend service flows, including lifelines, message arrows, flow group containers, note boxes, and color-coded swim lanes.
---

# Excalidraw Sequence Diagram

## Overview

This skill documents the exact Excalidraw JSON structure and visual conventions used in this project's sequence diagrams. All diagrams follow a consistent UML-style sequence layout: lifelines as vertical bars, color-coded flow groups as dashed containers, and arrows with attached labels.

---

## Coordinate System

- Origin is top-left. Positive x goes right, positive y goes down.
- **Lifelines are spaced ~190px apart** horizontally.
- **Messages (rows) are spaced ~40px apart** vertically.
- Each new flow group starts ~40px below the previous one.
- Left edge of diagram: x ≈ -220. Diagram width scales with participant count — use the x position formula; there is no fixed right boundary.

---

## Element Catalog

### 1. Lifeline Bar

A thin vertical rectangle representing a participant.

```json
{
  "type": "rectangle",
  "x": <center_x - 17>,
  "y": <header_bottom_y>,
  "width": 35,
  "height": <total_diagram_height>,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "#e9ecef",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "roundness": { "type": 3 }
}
```

- One per participant
- `height` should span all flow groups + 40px margin

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
  "x": <from_lifeline_right_x>,
  "y": <row_y>,
  "strokeColor": "<message_color>",
  "backgroundColor": "transparent",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "endArrowhead": "arrow",
  "startArrowhead": null,
  "elbowed": false,
  "roundness": { "type": 2 },
  "points": [[0, 0], [<distance>, 0]],
  "boundElements": [{ "id": "<label_id>", "type": "text" }]
}
```

- `distance` is positive (left → right)
- When the arrow label visually crosses another element, set `backgroundColor: "#ffffff"` on both the arrow and its label text to act as a readability mask

### 5. Return Arrow

Same structure as a forward call, but `points` go negative:

```json
"points": [[0, 0], [-<distance>, 0]]
```

- **ACK / void returns**: `strokeStyle: "solid"`, `strokeColor: "#868e96"` (grey)
- **DTO / data payload returns**: `strokeStyle: "dashed"`, `strokeColor: "#868e96"` (grey)
- Label text is the return value: "ACK", "DataDto", entity name, etc.

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

| Participant | Role | Include when |
|---|---|---|
| `CLIENT` | Frontend — initiates all user-driven requests | Feature has any user-triggered action |
| `AuthFilter` | Security gate — validates JWT, rejects unauthorized requests before they reach the controller | Feature is reachable via HTTP |
| `<Domain>Controller` | REST entry point — receives the authorized request, delegates to Service, returns HTTP response | Feature exposes an HTTP endpoint |
| `<Domain>Service` | Domain logic — orchestrates the operation: checks state, calls device, updates DB, manages operation context | Almost always |
| `OpStateService` | Generic async-operation tracker — holds `OpCtx<T>` with state `IN_PROGRESS → SUCCESS/FAILED`; each entity provides its own `EntityOperationContext` implementation | Feature has an async hardware operation with a completion condition |
| `<Domain>ServiceScheduler` | Domain wrapper around the Scheduler — registers `this::FetchData` on startup; owns the polling loop for this entity | Feature polls a device on a timer |
| `Scheduler` | Spring framework scheduler — fires registered tasks on a timer | Feature polls a device on a timer |
| `<Device>` / external system | Actual external hardware or system (RadioDevice, BNET, etc.) — HTTP calls to it are real device commands or status reads | Feature communicates with hardware or an external system |
| `<Domain>Repo` | Database repository — reads or writes the DB | Feature reads or writes persisted data |
| `fileService` | Saves files to disk (e.g. mission files) | Feature involves file I/O |
| `auditLog` | Writes audit trail entries | Feature requires audit logging |
| `radioClient` / `<Domain>Client` | HTTP client wrapper around external system calls | Feature uses a client abstraction layer over an external system |

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

## Common Mistakes

| Mistake | Fix |
|---|---|
| Arrow label not bound to arrow | Set `containerId` on text and `boundElements` on arrow |
| Return arrow going right | Points must be `[[0,0],[-distance,0]]` |
| Self-loop not elbowed | Set `"elbowed": true` and use 4-point path |
| Note box overlaps lifeline | Place note boxes at x > 590 (right of last standard lifeline) |
| Mixed `roughness` values | Always `roughness: 1` for consistency |
| Wrong font | Always `fontFamily: 5` |
| Flow container covers wrong rows | Measure exact y start/end of all rows in the group |
