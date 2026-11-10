# Core Patterns

Design services around domain invariants, explicit state ownership, and honest completion semantics. CRUD is one use case shape, not the architecture of every backend.

## Table of Contents

- [Constructor injection](#constructor-injection)
- [Application services and domain intent](#application-services-and-domain-intent)
- [State ownership and repository contracts](#state-ownership-and-repository-contracts)
- [Concurrency and atomic invariants](#concurrency-and-atomic-invariants)
- [Submission, acknowledgment, and confirmation](#submission-acknowledgment-and-confirmation)
- [Async operation pattern](#async-operation-pattern)
- [Deadlines, cancellation, and retries](#deadlines-cancellation-and-retries)
- [Transactions and external side effects](#transactions-and-external-side-effects)
- [Conditional JDBC and JPA guidance](#conditional-jdbc-and-jpa-guidance)
- [Lifecycle, errors, and observability](#lifecycle-errors-and-observability)
- [Verification checklist](#verification-checklist)

## Constructor injection

Use constructor injection for required collaborators. A single Spring constructor does not need `@Autowired`. Final dependency references make wiring stable; they do not make the collaborators or service state immutable or thread-safe.

Use a manual constructor when parameters need `@Qualifier`, configuration extraction, or validation. Do not assume Lombok copies field annotations to generated parameters. Inject typed configuration rather than using `@AllArgsConstructor` to include configuration scalars, mutable flags, or runtime registries as bean dependencies. See [lombok-guide.md](lombok-guide.md) and [configuration.md](configuration.md).

Avoid circular dependencies, field injection, service locators, and dependencies created inside use-case methods. Prefer existing infrastructure beans, with an explicit owner for resources that must close.

## Application services and domain intent

A service represents a use case: validate business preconditions, authorize access to the target, coordinate owners/adapters, and return a truthful result. Controllers handle transport concerns, not concurrency policy or remote command workflows.

- Validate syntax and shape at trust boundaries; enforce business invariants at the state-changing boundary, including non-HTTP callers.
- Enforce uniqueness where the write is atomic. An `existsByName` check can improve diagnostics but cannot replace a database constraint or a synchronized in-memory update.
- Name methods and predicates after domain meaning: `confirmTargetMode`, `hasReachedTargetMode`, `isObservationFresh`. Do not hide a transition behind `update`, or put meaningful predicates into opaque inline lambdas.
- Separate high-level orchestration from wire parsing, mapping, and low-level condition evaluation.
- Return a domain result, snapshot, or operation receipt. Keep HTTP status and GraphQL error extensions in transport adapters.
- Reuse a safe representation when contracts really are identical; do not add mandatory DTO/command/domain copies as ceremony.

Use records for snapshots and value types. Use controlled methods on mutable owners instead of public setters that can bypass invariants. [dto-and-mapping.md](dto-and-mapping.md) covers representation choices and defensive copying.

## State ownership and repository contracts

Define the repository's authority, lifetime, consistency, and failure behavior before its CRUD methods. Live in-memory observations and file-backed configuration are valid state boundaries; neither establishes a database-first architecture.

| Owner | Contract questions |
|---|---|
| Durable store | Which write is committed atomically? What survives restart? How are versions and migrations handled? |
| Live observed store | Who produced the value? How old is it? What happens on disconnect or reordering? |
| Session store | Which authenticated identity owns it? When does it expire? Is it process-local? |
| Cache | What is the source of truth? What invalidates it? Is stale data acceptable for this operation? |
| Operation registry | Which operations conflict? Who releases reservations, and only after what event? |

Use `Optional<T>` for a legitimately absent single lookup. Return empty collections rather than null unless a documented external contract requires otherwise. Repository results can be domain objects or purpose-built projections; they need not always be full entities, but should not leak a persistence framework's managed state across an unintended boundary.

Do not expose a mutable map's live `values()` view. `List.copyOf(values)` prevents collection mutation through that result, but does not deep-copy elements or create a coherent multi-object snapshot during concurrent writes. Replace immutable snapshots atomically or capture them under the owning synchronization when consistency requires it.

Distinguish a missing observation from a known inactive state. Treating unknown as inactive can permit an unsafe command. Cache eviction, session expiry, and remote disconnect have different meanings and should not share an accidental generic delete policy. See [validation-and-caching.md](validation-and-caching.md).

## Concurrency and atomic invariants

`ConcurrentHashMap` makes individual operations safe; it does not atomize check-then-act sequences, multiple keys, nested mutable values, or conflict checks across operation types.

Choose the mechanism that covers the complete invariant:

- `putIfAbsent` or `compute` for a single-key atomic transition; keep callbacks short and free of blocking external I/O.
- One owner lock or serialized execution for related keys or a conflict matrix. All readers/writers participating in the invariant must use that boundary.
- Database constraints, locking, or version checks for durable concurrent updates. Process locks do not coordinate multiple application instances.
- Identity-checked cleanup such as `remove(key, expectedOperation)` so an old completion cannot remove a newer registration. Use an identity token if value equality could equate distinct runs.

Do not execute user callbacks, complete futures, or call remote systems while holding an owner lock if they can block or reenter the service. Reserve/update state inside the critical section; perform I/O outside it; reconcile the result safely afterward.

A conflict relation needs domain review. If operation A excludes B but B does not exclude A, verify that asymmetry is intended; otherwise admission order changes correctness. Test conflicting submissions simultaneously, not just sequentially.

## Submission, acknowledgment, and confirmation

For asynchronous commands, document at least three stages:

| Stage | What it proves | What it does not prove |
|---|---|---|
| Submitted | Local execution/transport accepted work | Remote acceptance or completion |
| ACK | Remote protocol accepted the command, according to its contract | Requested state is now observed |
| Confirmed | A correlated, sufficiently fresh observation satisfies the domain condition | Every unrelated downstream effect is complete |

Some protocols have only a final response; others require a separate observation stream. Do not invent extra stages, but do not label an ACK as completion when the protocol does not guarantee it.

For a confirmed operation:

1. Validate and atomically reserve the conflict scope.
2. Establish the freshness/correlation baseline and observation strategy.
3. Submit the bounded command and handle ACK/rejection.
4. Await a valid confirmation under the overall deadline.
5. Release subscriptions and execution resources; release conflict ownership when execution can no longer violate it.

**Freshness is part of correctness.** A replay-latest snapshot is useful for subscribers rendering current state, but an old matching snapshot must not automatically confirm a new command. Prefer protocol correlation IDs, monotonic revisions, or a request-scoped generation. Timestamps alone require assumptions about clocks, ordering, and precision.

**Subscription order is protocol-dependent.** Subscribing only after ACK can miss a non-replayed confirmation emitted before subscription. Subscribing before send avoids that gap only if observations are buffered/correlated and stale values rejected. Recurring state observations and one-shot events need different guarantees; define and test the policy.

Handle stream completion without a matching value as failure or an explicit domain outcome, never implicit success. Specify sink emission failure, backpressure, bounded buffering, disconnect/reconnect, and out-of-order observations. A dropped confirmation event is not equivalent to a dropped UI refresh. See [graphql-patterns.md](graphql-patterns.md) for subscription boundaries.

## Async operation pattern

Use this **feature service + shared coordinator + independently observed state** recipe when the application already has command coordination. `OperationService`, `OperationType`, and `OperationResponseHandler` below are **application APIs**, not Spring classes. Adapt to the existing coordinator; do not build a workflow engine or add `@Async` just to reproduce the example.

### Responsibilities and sequence

```text
GraphQL mutation
  → feature service chooses operation identity, command, and business completion condition
  → shared coordinator registers conflict scope atomically
  → virtual-thread worker invokes a lazy Supplier<CompletableFuture<ACK>>
  → submission succeeds (retry only if safe) and ACK is received
  → response handler OR confirmation observation establishes the result
  → coordinator cleans up, releases ownership when safe, completes caller future
  → controller maps the result with thenApply

Separate ingestion path:
scheduled read / incoming device event → validate observation → repository.save
                                                    ├─ latest state for queries/UI
                                                    └─ fresh observations for confirmation
```

| Responsibility | Owner |
|---|---|
| Authorization, device/resource preconditions, operation identity, target-state predicate | Feature/application boundary |
| Atomic admission, execution resource, submission retry, one deadline, interruption and cleanup | Shared operation coordinator |
| Request/response encoding and bounded transport I/O | Existing client/transport adapter |
| Validated observed state and its publication contract | Repository/observation owner |
| GraphQL/REST projection and safe public error translation | Controller/mapper/resolver |

Keep the command supplier lazy: passing `() -> client.send(...)` lets admission happen before sending and creates a new attempt on retry. Calling `client.send(...)` first and passing its already-started future can perform a forbidden/conflicting side effect before the coordinator accepts it.

### Choose the coordinator path

Example coordinator contract (application imports omitted):

```java
<S, R> CompletableFuture<R> execute(
        String deviceId,
        OperationType operation,
        Supplier<CompletableFuture<S>> sendRequest,
        OperationResponseHandler<S, R> handleResponse);

<R> CompletableFuture<R> executeConfirmed(
        String deviceId,
        OperationType operation,
        Supplier<CompletableFuture<?>> sendRequest,
        Mono<R> confirmation);
```

- Use **`execute`** when a final response or a bounded follow-up establishes the result. The application handler is `R handle(S response) throws Exception`; it runs after successful submission, once, and must honor interruption and bounded I/O. Handler failure must not resend a successfully submitted command.
- Use **`executeConfirmed`** when a separate observation is required. Return the matching observed value, not a reconstruction from requested fields. Use the coordinator's overall budget rather than adding unrelated timers at every layer.
- In a backend without this abstraction, design the required guarantees with its existing futures/reactive/lifecycle facilities. The pattern is the responsibility split, not compulsory API names or a reusable workflow engine.

### Feature-local operation type

Place this in `feature/power/operation/PowerOperation.java`, using the actual shared `OperationType` import:

```java
public enum PowerOperation implements OperationType {
    SET_TRANSMISSION_POWER;

    @Override
    public boolean blocksOtherOperations() {
        return false;
    }
}
```

This example assumes duplicate operations on the same device conflict even when the flag is false. Inspect actual admission logic: a check of only `running.blocksOtherOperations()` is directional, so a newly arriving exclusive operation could still start beside earlier work. Test both admission orders and the resource scope; the flag alone does not establish mutual exclusion.

### Feature service: submit, then confirm observed state

The fragment assumes application types `DeviceClient`, `SystemParametersRepository`, `SystemParameters`, and `ETransmissionPower`, plus the enum above. Adapt their names and signatures to the actual feature. `CompletableFuture` is from `java.util.concurrent`, `Predicate` from `java.util.function`, `Mono` from `reactor.core.publisher`, and constraints from `jakarta.validation.constraints`.

```java
@Service
@Validated
@RequiredArgsConstructor
public class PowerService {
    private final DeviceClient deviceClient;
    private final SystemParametersRepository repository;
    private final OperationService operations;

    public CompletableFuture<SystemParameters> setTransmissionPower(
            @NotBlank String deviceId, @NotNull ETransmissionPower target) {
        return operations.executeConfirmed(
                deviceId,
                PowerOperation.SET_TRANSMISSION_POWER,
                () -> deviceClient.setTransmissionPower(deviceId, target),
                awaitTransmissionPower(deviceId, target));
    }

    public CompletableFuture<SystemParameters> refreshFromDevice(@NotBlank String deviceId) {
        return deviceClient.readSystemParameters(deviceId)
                .thenApply(observed -> repository.save(deviceId, observed));
    }

    private Mono<SystemParameters> awaitTransmissionPower(
            String deviceId, ETransmissionPower target) {
        return Mono.defer(() -> repository.observations(deviceId)
                .filter(hasTransmissionPower(target))
                .next());
    }

    private static Predicate<SystemParameters> hasTransmissionPower(ETransmissionPower target) {
        return observed -> observed.transmissionPower() == target;
    }
}
```

Spring stereotypes/validation imports are `org.springframework.stereotype.Service` and `org.springframework.validation.annotation.Validated`; the constructor annotation is `lombok.RequiredArgsConstructor`. The domain predicate is named; the orchestration reads as a use case rather than a state comparison. Service validation needs the normal validation-enabled proxy. Authorization and connected-device/resource ownership must be established by the host application's shared entry policy **before admission**, not assumed from the string ID or these validation annotations.

**Required source contract for this fragment:** `observations(deviceId)` publishes fresh observations, including unchanged values, without cached replay; the coordinator subscribes after ACK. This requires recurring reads/events after ACK and rejection of stale/out-of-order reads at ingestion. `Mono.defer` makes registration lazy but does **not** prevent missing a one-shot confirmation before subscription. For one-shot sources, establish a correlated listener before sending through the coordinator's lifecycle. Without command IDs/revisions, matching observations establish eventual state, not proof that this command caused it. If causality is part of the API promise, this fragment is insufficient.

### Controller: return and project the future

Fragment inside a feature `@Controller`; `powerService` and `mapper` are injected collaborators, `PowerGql` is the application's output, and the authority is illustrative. Reuse the actual schema, DTO mapping, and permission policy:

```java
@MutationMapping("setTransmissionPower")
@PreAuthorize("hasAuthority('power:write')")
public CompletableFuture<PowerGql> setTransmissionPower(
        @Argument("deviceId") @NotBlank String deviceId,
        @Argument("power") @NotNull ETransmissionPower power) {
    return powerService.setTransmissionPower(deviceId, power)
            .thenApply(mapper::toGql);
}
```

The SDL enum and output must match these Java contracts. Existing resource authorization still applies; a standard authority check is not device ownership. Do not call `.join()`, `.get()`, `.block()`, or `.subscribe()` here. If the established public contract safely shares the domain snapshot, a duplicate output/mapper is not required.

### Connect ingestion and subscriptions

`refreshFromDevice` belongs on the **independent observation path**. Wire it into the existing connected-device poller, event handler, or streaming client; a mutation that waits for observations with no producer can only time out. Handle background failures at the owned scheduling/transport boundary; do not detach an unobserved future or hide a command failure as `null` success.

Saving an observed value feeds confirmation; an optional public subscription can project the same state under its own replay contract. Keep cached UI replay separate from fresh evidence, and deduplicate replaceable UI updates after the confirmation path when repeated identical observations are required. Define producer serialization and publication failure behavior.

The coordinator must already own its virtual-thread executor and shutdown. A feature uses that coordinator rather than its own pool, extra `@Async`, common-pool `supplyAsync`, private retry loop, or local conflict registry. Its submission supplier must return a fresh bounded future for every attempt. Polling cadence is not single-flight protection: async dispatch can overlap even with `fixedDelay`.

### Verify the async pattern

Use controlled futures and an observation sink:

1. Before admission, assert no client command starts. On conflicting/denied/invalid input, assert no send occurs.
2. Start a command and keep its ACK future incomplete; the feature's result must remain incomplete.
3. Complete ACK, then publish a fresh non-target observation; the result must still be incomplete.
4. Publish the target observation after confirmation registration; assert the returned value is **that observation**, and listener counts return to baseline.
5. Provide an old matching snapshot and a delayed pre-command read; neither may confirm the request. For one-shot sources, force confirmation in the send/ACK window and prove it is not missed.

A mocked coordinator proves feature wiring, not execution guarantees. Test deadlines, conflicts, safe retries, cancellation, rejection, and shutdown against the real coordinator using the [async test matrix](testing.md#deadlines-acks-retries-and-cancellation).

## Deadlines, cancellation, and retries

A timeout ends a wait; it does not prove that the worker, remote command, or side effect stopped. Java interruption is cooperative. `CompletableFuture.orTimeout` completes that future exceptionally but does not stop its underlying task; applying it to a shared future also changes what other waiters observe.

- Bound each transport attempt and the whole operation, including retries, backoff, ACK, and confirmation.
- Separate caller-facing completion from internal execution ownership. A detached future view such as `copy()` can isolate caller cancellation, but is not a complete cancellation policy.
- Decide whether caller disconnect/cancellation only detaches a waiter or actively aborts an operation. Authorization-sensitive remote work must not outlive its allowed session accidentally.
- Retain conflict reservations while timed-out code can still run or send effects. If termination cannot be established, use an explicit quarantined/unknown state and reconciliation policy rather than falsely reporting the target free.
- Cancel observation waits and scheduled timers on every terminal path. Restore interrupted status when translating `InterruptedException`.

Retry only failures that the protocol and operation make safe. An ACK timeout can mean the command executed and the reply was lost. Blindly retrying a non-idempotent action may execute it twice.

Prefer an idempotency/correlation key and remote deduplication when available. Otherwise reconcile observed state, use a demonstrably idempotent operation, or fail with an uncertain outcome. Bound attempts and backoff; stop on rejection, authentication failure, cancellation, or exhausted deadline. Each retry must create a new bounded attempt, not wait again on the same failed future. Retry submission separately from confirmation unless the domain explicitly permits resending.

## Transactions and external side effects

Use Spring `@Transactional` only for operations participating in the configured transaction manager. A local database rollback does **not** unsend a network command, reverse a payment, restore an arbitrary file, or roll back a concurrent map.

- Keep database transactions short; avoid waiting for remote confirmation while holding database locks/connections.
- Understand proxy boundaries: ordinary self-invocation bypasses proxy-based transaction advice.
- Default rollback rules generally cover unchecked exceptions/errors, not every checked exception. Declare the required policy and test it.
- `readOnly = true` is an optimization hint, not authorization or guaranteed write prevention.
- A local transaction does not automatically cross executor threads, future callbacks, or arbitrary reactive boundaries. Use the transaction model matching the actual data-access stack.

When a durable write and external delivery must survive crashes, consider a transactional outbox with idempotent consumers. For a simpler workflow, explicitly persist pending/failed state and reconcile, or define compensation. An after-commit callback avoids sending before commit but is not itself durable delivery. Choose the failure model first; do not add distributed-workflow machinery without a real requirement.

## Conditional JDBC and JPA guidance

The following applies **only when the target project actually uses that persistence approach**. A driver or starter declaration is not evidence of implemented storage or durability.

### JDBC

Use the established `JdbcTemplate`, `NamedParameterJdbcTemplate`, or supported `JdbcClient` style. `JdbcClient` requires Spring Framework 6.1+ (Boot 3.2+ or compatible Boot 4); do not introduce it into an older baseline without checking.

Fragment inside a JDBC repository; `jdbc` is an injected `JdbcTemplate`:

```java
public java.util.Optional<String> findName(String deviceId) {
    return jdbc.queryForList(
            "select name from device where id = ?", String.class, deviceId)
            .stream().findFirst();
}
```

The example assumes `id` is unique. Bind all values; never concatenate untrusted SQL. Parameters cannot bind identifiers or sort directions—select those from a fixed allowlist. Specify row mapping, null handling, affected-row expectations, pagination, and exception translation. Use constraints to enforce integrity under concurrent writes.

### JPA

Use Spring Data JPA only with the relevant dependencies, configured entity scanning, transaction manager, and a real entity model. Records suit projections/DTOs, not ordinary JPA entities. Use `jakarta.persistence` for Boot 3/4, the required accessible no-argument constructor, and deliberate entity identity semantics.

Keep lazy relationships inside a deliberate fetch/transaction boundary. Use projections or bounded fetch plans to avoid N+1 queries and unbounded graphs. Consider optimistic locking for conflicting updates. Custom repository fragments or specifications are appropriate for real query complexity; do not generate a generic criteria framework preemptively. See [lombok-guide.md](lombok-guide.md) for entity equality/proxy hazards.

### Schema and SQLite

Use the project's supported migration tool and test migrations against the actual engine/version. Do not assume JPA schema auto-update is a production migration strategy or that every migration tool supports SQLite in the same edition/version.

SQLite needs an explicit writable file location, backup/recovery policy, connection-level foreign-key verification, busy/locking policy, and realistic concurrent-write tests. Its write concurrency and DDL support differ from server databases; connection pooling or WAL mode does not turn it into a multi-writer server. Test filesystem permissions, transaction behavior, upgrades, and crash recovery for the deployment. Never silently replace durable requirements with an in-memory database.

## Lifecycle, errors, and observability

Every executor, scheduler, socket, subscription, and listener needs an owner and a terminal path. Stop accepting work before shutdown, release partial-startup resources in reverse acquisition order, make cleanup repeatable, and bound draining. A Spring lifecycle callback does not force uncooperative remote work to terminate.

Preserve the original failure when cleanup also fails; continue releasing independent resources and report secondary failures appropriately. Do not catch broad exceptions merely to log and return null. Catch at the boundary that can translate, retry safely, compensate, or release owned resources.

Log useful transitions and safe correlation identifiers: admitted, rejected, ACK, confirmed, timed out, reconciled. Routine lookups and expected not-found results rarely justify error logs. Avoid logging full DTOs, snapshots, configuration, tokens, or credential objects. Record an exception once at the responsible boundary rather than at every layer. See [exception-handling.md](exception-handling.md).

## Verification checklist

- Constructor wiring includes qualifiers and excludes runtime/configuration state.
- Business invariants hold for concurrent callers and bypassing transport adapters.
- Repository results cannot mutate owned state; restart/multi-instance limitations are explicit.
- Tests distinguish submission, rejection, ACK, fresh confirmation, stale replay, and empty/disconnected streams.
- Timeout/cancellation tests show whether execution stopped and when the conflict slot is released.
- Retry tests cover lost ACKs, duplicate effects, terminal failures, and overall deadlines.
- Partial startup, executor rejection, shutdown, and cleanup failures release all owned resources.
- Transaction tests cover actual rollback rules and make external-side-effect limits visible.
- SQL/migration/entity tests run against the intended database when persistence is implemented.

See [testing.md](testing.md) for test techniques and [complete-examples.md](complete-examples.md) for an integrated local-state flow.
