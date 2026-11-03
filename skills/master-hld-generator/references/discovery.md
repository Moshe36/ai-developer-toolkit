# Discovery

Read by explorer subagents (phase 1) and by the orchestrator when building the contract (phase 2).

## Rules for explorers

- You own **one axis**. Scan for your axis across the whole target service.
- **Every finding must carry `path/File.java:LINE`.** A finding without a citation is discarded.
- **Overlap with other axes is expected and correct.** If a mapper throws, report it — the `exceptions` explorer will report it too, and the orchestrator dedupes on `file:line`. Do not skip a finding because you think another explorer owns it. Do not coordinate with other explorers.
- Report what the code proves. Never infer, never extrapolate, never mark something "probably".
- Write findings to `.hld-work/discovery/<axis>.md`. Return a **compact receipt only**: counts per category plus the findings file path. Never return the findings themselves.

---

## Axis: `entrypoints`

Search for every way runtime execution can begin.

`@RestController` · `@Controller` · `@RequestMapping` · `@GetMapping` · `@PostMapping` · `@PutMapping` · `@PatchMapping` · `@DeleteMapping` · `@Scheduled` · `@PostConstruct` · `@PreDestroy` · `ApplicationRunner` · `CommandLineRunner` · `@EventListener` · `@Async` · `@KafkaListener` / `@RabbitListener` / `@JmsListener` / any message consumer · message producers · `HealthIndicator` · GraphQL `@QueryMapping` / `@MutationMapping` · gRPC service impls · WebSocket handlers.

Report per finding: `file:line` · trigger type · HTTP method + path (if applicable) · method signature · declaring class · request/input type · declared return type · **the domain aggregate or resource this entry point operates on**.

**Determining the aggregate.** Follow the call one or two levels into the service and record the aggregate, entity, or resource the entry point primarily reads or mutates, plus the `file:line` that proves it. This column drives feature grouping in phase 2, so it must be evidence-backed. Where the entry point mutates one aggregate and reads another, record the one it **mutates**. Where you genuinely cannot tell, record `unknown` — the orchestrator resolves it. Never guess from the method name alone.

**Also record whether the entry point has more than one success path.** If the method branches into mutually exclusive business outcomes (create vs. update, full vs. summary, dispatch on message type) or performs conditional extra work, record the branch conditions and their `file:line`. Writers need this to build the Happy-path branches; without it they will trace only the path they happened to read first.

### Findings format

```markdown
| file:line | Trigger Type | Entry Point | Input Type | Return Type | Aggregate (evidence) | Success Paths |
| --------- | ------------ | ----------- | ---------- | ----------- | -------------------- | ------------- |
| src/main/java/com/x/OrderController.java:41 | HTTP POST /orders | OrderController.create | CreateOrderRequestDto | ResponseEntity of OrderDto | Order (OrderService.java:63 saves OrderEntity) | single |
| src/main/java/com/x/OrderController.java:58 | HTTP PUT /orders/{id} | OrderController.save | SaveOrderRequestDto | ResponseEntity of OrderDto | Order (OrderService.java:91 saves OrderEntity) | 2 — order exists (OrderService.java:88) / order is new (OrderService.java:95) |
```

---

## Axis: `exceptions`

Search for every failure the code can produce and every place failure is handled.

`throw new` · `orElseThrow` · `catch` blocks (including caught-and-logged and caught-and-ignored) · `@ControllerAdvice` · `@RestControllerAdvice` · `@ExceptionHandler` · custom exception classes · `@Valid` / `@Validated` · every validation annotation on request DTOs (`@NotNull`, `@NotBlank`, `@Size`, `@Pattern`, `@Min`, `@Max`, `@Email`, custom validators) · `ResponseStatusException` · `@ResponseStatus` · framework-level failures the entry point can produce (unreadable JSON body, unsupported content type, missing body, missing path/query/header, enum/type conversion failure).

Report per finding: `file:line` · condition that triggers it · exact exception type · where it is caught or whether it propagates · the final outcome (HTTP status + body shape, or the non-HTTP runtime outcome).

**Do not assume a `GlobalExceptionHandler` catches anything.** Record only handler mappings the code proves. Record explicitly when an exception propagates unhandled to framework default.

**Preserve specificity.** `MongoTimeoutException` and `MongoException` are separate findings when their handling differs. Distinct parse failure causes (`fileNotFound`, `mismatchedInput`, `invalidSyntax`, `IOException`) are separate findings.

### Findings format

```markdown
| file:line | Condition | Exception | Handled At (file:line) | Final Outcome |
| --------- | --------- | --------- | ---------------------- | ------------- |
| src/main/java/com/x/OrderService.java:88 | no Order document for orderId | OrderNotFoundException | GlobalExceptionHandler.java:52 | HTTP 404 Not Found (empty body) |
```

---

## Axis: `mappers`

Search for who actually constructs every returned DTO or output object.

Mapper interfaces and classes · `@Mapper` · `uses = ...` · `default` methods · `@Mapping(expression = ...)` · nested/derived `@Mapping` · `@AfterMapping` / `@BeforeMapping` · methods named `toDto` / `toXxxDto` / `toResponse` / `map` / `fromEntity` / `toApi` · methods returning a DTO type · methods accepting the entity a service returns · mapper fields injected into controllers/services · manual builder/constructor DTO assembly inside controllers and services · `ResponseEntity` construction.

For every DTO or output object that can be returned to a caller, determine the **actual owner class** by reading the code, and classify the mapper's behavior.

Report per finding: DTO type · owner class + `file:line` of the construction · whether a mapper exists · mapper class · mapper behavior classification (`pure-field-copy` or `non-trivial`) · what makes it non-trivial · whether the mapper can throw.

A mapper is **non-trivial** when it: builds the returned DTO; maps a list/collection; maps nested objects/maps/lists; computes or derives a field; reads config/properties; uses another mapper/service/helper; has `@Mapping(expression=...)`, nested or derived `@Mapping`, `default` methods, or `@AfterMapping`/`@BeforeMapping`; calls another component; can throw; or performs any business-relevant transformation. Otherwise it is `pure-field-copy`.

### Findings format

```markdown
| DTO / Output | Owner (file:line) | Mapper Class | Behavior | Non-trivial Because | Can Throw |
| ------------ | ----------------- | ------------ | -------- | ------------------- | --------- |
| OrderDto | OrderMapper.java:19 | OrderMapper | pure-field-copy | — | no |
| HakashFullDetailsDto | HakashMapper.java:33 | HakashMapper | non-trivial | maps networks map, loads slot definitions via BroadcastPolicyService | yes — SlotParsingException |
```

---

## Axis: `data`

Search for everything the service reads or writes at runtime.

Repository interfaces and implementations (`JpaRepository`, `CrudRepository`, `MongoRepository`, custom) · `MongoTemplate` / `JdbcTemplate` / `EntityManager` · `@Query` · cache access (`@Cacheable`, `@CachePut`, `@CacheEvict`, direct cache API) · in-memory state (`Map`, `List`, `Set`, `AtomicReference`, static/instance fields holding runtime state) · `@Value`, `@ConfigurationProperties`, `Environment` reads · external clients (`RestTemplate`, `WebClient`, `FeignClient`, raw HTTP, gRPC stubs) · file IO · XML/JSON/YAML parsers and serializers · message producers.

Report per finding: `file:line` · operation kind (read/write/update/delete/get/put/evict) · what backing store it actually reaches (and the evidence for that) · the object written · the object returned.

**Do not assume repository means database.** Record the proven backing store, or record `unknown` with the reason. Never record in-memory state as a database.

### Findings format

```markdown
| file:line | Kind | Component | Backing Store (evidence) | Data In | Data Out |
| --------- | ---- | --------- | ------------------------ | ------- | -------- |
| src/main/java/com/x/OrderRepository.java:14 | read | OrderRepository.findById | MongoDB (extends MongoRepository, OrderRepository.java:11) | orderId | Optional of OrderEntity |
| src/main/java/com/x/LockRegistry.java:27 | read | in-memory ConcurrentHashMap | InMemoryState | resourceId | LockInfo |
```

---

## Phase 2 — Building the contract (orchestrator only)

Merge the four findings files. Dedupe on `file:line`. Where two explorers make conflicting claims about the same line, reopen **only that file** and resolve it from the code.

### Flow inventory rules

- One endpoint, trigger, or operation is **one candidate flow**.
- Never combine create/update/delete/read into one flow. No umbrella diagrams.
- Small real flows still count.
- Private helper-only methods are not flows; they are covered inside their parent flow.
- Every entry point found in phase 1 is either **included** or **excluded with a valid reason**. No silent omissions.

**Valid exclusion reasons — the complete list:**

| Reason | Meaning |
|---|---|
| private helper only | Not reachable as an independent entry point |
| pure mapper/converter only | No runtime sequence of its own |
| no meaningful sequence | Single-step, no cross-class calls, no data access |
| duplicate identical behavior covered by `<flow name>` | Byte-for-byte same runtime path |
| test-only utility | Not reachable in production runtime |
| explicitly covered inside `<flow name>` | Traced as part of another flow |

Anything else is not a valid exclusion. If in doubt, include the flow.

**Sanity check before freezing** — rescan if any fail, or if the flow count looks suspiciously low:

- [ ] Every controller mapping in `entrypoints.md` is accounted for
- [ ] Every non-HTTP trigger is accounted for
- [ ] Every public service operation is mapped to a flow or excluded
- [ ] No grouped CRUD or domain-umbrella flows

### Feature grouping

Related flows are presented together in the final document. Grouping is a **presentation decision made here and frozen** — it never changes a diagram.

**Group by the domain aggregate or resource the flows operate on**, not by class or package. Take the aggregate from the `Aggregate` column of `entrypoints.md`, which is evidence-backed. All flows that read or write the `Order` aggregate form one feature; all flows that write audit log entries form another, even when they live in different controllers. This matches how a reader searches ("show me everything about logging") and survives refactors that move methods between classes.

Rules:

- Every included flow belongs to exactly one feature group.
- Where `entrypoints.md` recorded `unknown`, resolve the aggregate by reading that entry point directly. Do not group on a name-similarity guess.
- Grouping is judgement, so record the aggregate or resource that justifies each group. If a flow touches two aggregates, group it by the one it **mutates**; if it mutates neither, group it by the one it primarily **reads**.
- **Order the groups first, then number the flows 1..N straight through**, so every group's flows are contiguous. Numbering is assigned after grouping, never before.
- A group holding exactly one flow gets **no group heading** in the final document — that flow is rendered on its own. Still record the group in the contract.
- Grouping never merges flows, never produces an umbrella diagram, and never changes a diagram's content. One entry point is still one flow with one diagram.

### `.hld-work/contract.md` format

```markdown
# HLD Contract — <Service Name>

FROZEN. Writers must use these values verbatim and must not re-derive them.

## 1. Participant Alias Registry

| Alias | Class / Component | Kind |
| ----- | ----------------- | ---- |
| Client | — | caller |
| API | OrderController | controller |
| SVC | OrderService | service |
| Repo | OrderRepository | repository |
| MongoDB | — | datastore |
| Mapper | OrderMapper | mapper |
| GEH | GlobalExceptionHandler | error handler |

## 2. Feature Groups (FROZEN)

| Group | Aggregate / Resource | Flow Numbers | Grouping Justification |
| ----- | -------------------- | ------------ | ---------------------- |
| Orders | Order | 1-3 | all three read or mutate the Order aggregate |
| Audit Logging | AuditLogEntry | 4-5 | both append AuditLogEntry documents |

## 3. Flow Inventory (FROZEN numbering)

Numbered 1..N in group order, so each group's flows are contiguous.

| # | Group | Flow Name | Trigger Type | Entry Point (file:line) | Include | Exclusion Reason |
| - | ----- | --------- | ------------ | ----------------------- | ------- | ---------------- |

## 4. Exception -> Handler -> Outcome Map

| Exception | Thrown At (file:line) | Handled At (file:line) | Final Outcome |
| --------- | --------------------- | ---------------------- | ------------- |

## 5. Domain Glossary

| Canonical Name | Kind | Class (file:line) |
| -------------- | ---- | ----------------- |

## 6. Mapper / DTO Ownership

| DTO / Output | Owner Class | Mapper Behavior | Non-trivial Because |
| ------------ | ----------- | --------------- | ------------------- |
```

**Trigger types:** HTTP/API endpoint · query/read · mutation/write · scheduler/background · startup/bootstrap · shutdown · async/event/message · health/observability · internal business flow · file/serialization · external integration.

Freeze the contract before dispatching any writer. Do not modify it during phase 3.
