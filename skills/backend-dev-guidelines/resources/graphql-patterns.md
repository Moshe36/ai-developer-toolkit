# GraphQL Patterns

Schema-first Spring for GraphQL APIs, including asynchronous commands and long-lived subscriptions. Examples are illustrative fragments: `LinkService`, DTOs, mappers, watch registrations, and ownership checks are application types, not framework APIs.

## Table of Contents

- [Discover before implementing](#discover-before-implementing)
- [Contract and input parity](#contract-and-input-parity)
- [Thin queries and asynchronous mutations](#thin-queries-and-asynchronous-mutations)
- [Pagination and batching](#pagination-and-batching)
- [Subscription contract](#subscription-contract)
- [Demand, emissions, and cleanup](#demand-emissions-and-cleanup)
- [Snapshot and confirmation races](#snapshot-and-confirmation-races)
- [Authorization and transport security](#authorization-and-transport-security)
- [Errors and verification](#errors-and-verification)
- [References](#references)

## Discover before implementing

Read the build, schema, runtime wiring, controllers, service return types, security chain/interceptors, and tests. Identify the actual Java, Boot, Spring GraphQL, GraphQL Java, and Reactor versions; use their matching documentation and imports. Boot 3 and Boot 4 are not interchangeable dependency templates. Both use `jakarta.validation`; Boot customizer/test package locations can change between majors.

## Contract and input parity

Define the SDL contract first, then align Java binding, validation, mapping, and tests. Boot normally discovers `.graphqls`/`.gqls` resources under `classpath:graphql/**`; files are merged, not imported by a magic main schema. Follow configured locations. Define each root type once and use `extend type` for additional definitions when splitting by feature.

```graphql
enum LinkMode { ACTIVE INACTIVE }

input SetLinkModeInput {
  linkId: ID!
  mode: LinkMode!
}

type Link {
  id: ID!
  mode: LinkMode!
  description: String
}

type Query { link(linkId: ID!): Link }
type Mutation { setLinkMode(input: SetLinkModeInput!): Link! }
type Subscription { linkChanged(linkId: ID!): Link! }
```

```java
public enum LinkMode { ACTIVE, INACTIVE }

public record SetLinkModeInput(
        @NotBlank String linkId,
        @NotNull LinkMode mode) {}
```

- Imports: constraints from `jakarta.validation.constraints`, `@Valid` from `jakarta.validation.Valid`, mapping annotations from `org.springframework.graphql.data.method.annotation`.
- `@NotBlank` is for strings; enums/objects use `@NotNull`. `@Size` does not imply non-null. Required nested inputs need both `@NotNull` and `@Valid`; bound collections need size limits and element validation.
- GraphQL `ID` can bind to `String`; `Int` is signed 32-bit, not an arbitrary Java `long`. Match scalar coercion, enum wire values, and output properties. Register custom scalars through existing `RuntimeWiringConfigurer`; declaring `scalar DateTime` alone supplies no coercion implementation. Jackson annotations are not GraphQL schema mapping rules.
- Match nullability deliberately: `[Link!]!` allows an empty list but neither a null list nor null elements. A failed non-null field bubbles to the nearest nullable ancestor, possibly nulling all `data`.
- A nullable lookup may legitimately return null for absence if that is the published contract; do not universally replace null with an exception. Decide whether absence is normal or an error and test it.
- GraphQL rejects invalid enum/non-null inputs before fetching. Bean Validation enforces application constraints only with a configured validator and supported invocation path; test the actual resolver rather than assuming a particular error envelope.

### Omission is not explicit null

For a partial-update field, define all three outcomes: omitted = unchanged, explicit null = clear or reject, value = replace. A nullable Java field or `Optional` usually collapses omission and null. Where the distinction matters, Spring GraphQL supports `org.springframework.graphql.data.ArgumentValue`, including nested input fields in supported versions:

```java
public record PatchLinkInput(
        @NotBlank String linkId,
        ArgumentValue<String> description) {}
```

An application service checks `description.isOmitted()` before using `description.value()`, which can be null. Validate a provided value and whether clearing is legal; do not put unsupported string constraints on the wrapper itself. Verify binder/validation support for the resolved version, including nested fields and variables. SDL defaults can replace omitted values, so avoid defaults that destroy patch semantics. Keep a plain nullable field when omission and null intentionally mean the same thing.

## Thin queries and asynchronous mutations

Inside an application `@Controller` with constructor-injected service and mapper:

```java
@QueryMapping("link")
@PreAuthorize("hasAuthority('link:read')")
public LinkGql link(@Argument("linkId") String linkId) {
    return mapper.toGql(service.getLink(linkId));
}

@MutationMapping("setLinkMode")
@PreAuthorize("hasAuthority('link:write')")
public CompletableFuture<LinkGql> setLinkMode(
        @Argument("input") @Valid SetLinkModeInput input) {
    return service.setLinkMode(input.linkId(), input.mode())
            .thenApply(mapper::toGql);
}
```

Use explicit field/argument names to avoid coupling the contract to Java parameter metadata. Map at the boundary, enforce business invariants and resource authorization in the service. Reuse an existing mapper; do not require MapStruct for a trivial projection.

Return the existing asynchronous type. Do not call `.join()`, `.get()`, or `.block()` in a resolver, and do not call `.subscribe()` to detach the work from GraphQL. A `thenApply` mapper should be quick and non-blocking. Do not wrap blocking I/O in `completedFuture` or default-pool `supplyAsync` and call it non-blocking; use the application's established executor/stack and propagate security/correlation context across thread changes.

**Name the completion milestone.** The SDL above is valid only if the service future completes with the promised link state. A queued command, transport ACK, and freshly observed target state are distinct:

| Milestone | What the response may promise |
| --- | --- |
| Accepted | The application admitted the request; execution may still fail. |
| ACK | The peer acknowledged the command according to its protocol; not necessarily applied. |
| Confirmed | A correlated fresh observation satisfies the requested condition. |

If the service only returns acceptance, return an explicitly designed acceptance/operation payload, not a fictional confirmed `Link`. An operation ID/status query requires a real lifecycle, access control, retention, and recovery contract; do not invent one merely to avoid waiting. Document timeouts, rejection, busy state, partial batch failure, and unknown outcome after disconnection. GraphQL serializes top-level mutation fields, not every command from different requests; concurrency control belongs in the service.

## Pagination and batching

- Bound every potentially growing collection and batch input. Validate page/count arguments and impose server-side limits even for nested fields. A default count without a maximum is not a bound.
- Follow the existing offset/cursor contract. Cursor connections need stable ordering with a unique tie-breaker, opaque cursors, and documented behavior under concurrent changes. Use Spring Data adapters only when Spring Data is actually installed and configured.
- Nested resolvers that load once per parent cause N+1 I/O, including remote API calls. Use `@BatchMapping` for straightforward associations; use `BatchLoaderRegistry` plus `org.dataloader.DataLoader` when keys, filters, or context need explicit handling.
- Return loader futures; joining before dispatch can stall execution. A mapped loader must associate results with the correct keys; ordered loaders must preserve requested ordering and missing-result semantics.
- Keep DataLoader caches scoped to execution, not shared across users. Include tenant/filter dimensions in keys when relevant, enforce access in batch loads, cap batch sizes, and test mutation invalidation and long-lived subscription cache behavior for the actual version.

## Subscription contract

Subscriptions use `@SubscriptionMapping` and a Reactive Streams publisher, commonly `reactor.core.publisher.Flux`:

```java
@SubscriptionMapping("linkChanged")
@PreAuthorize("hasAuthority('link:read')")
public Flux<LinkGql> linkChanged(@Argument("linkId") String linkId) {
    return service.watchLink(linkId).map(mapper::toGql);
}
```

The application watch API must authorize the requested resource and define:

| Decision | Required contract |
| --- | --- |
| Scope | Resource, tenant, user, or client; never broadcast another caller's state. |
| Initial value | Fresh events only, initial snapshot plus updates, or bounded replay. |
| Delivery | Best-effort state projection versus durable event history. |
| Ordering | Per-resource sequence/revision, duplicate handling, and any global-order guarantee. |
| Reconnect | Re-read current state, resume from a durable cursor, or explicitly lose intervening updates. |
| Limits | Subscribers, idle lifetime, event size/rate, buffer capacity, slow-client behavior. |

`Sinks.many().replay().latest()` retains one latest value for new subscribers; it is not fresh-command confirmation, a durable log, or a complete slow-consumer policy. A hot sink can miss events before subscription; a cold publisher can allocate a listener per subscription. Choose intentionally. Async child-field fetching can also affect delivery order: check GraphQL Java's version-specific ordering support rather than assuming source order survives execution; ordered delivery can introduce buffering and head-of-line blocking.

## Demand, emissions, and cleanup

1. Allocate per-subscriber listeners/resources on subscription, usually with `Flux.defer`, not while constructing a publisher that might never be subscribed.
2. At a callback boundary, select an explicit bounded queue, error-on-overflow policy, or latest-only coalescing for replaceable snapshots. Reactor's no-argument `onBackpressureBuffer()` and common `Flux.create` buffer defaults can be unbounded. Never use them as a production default.
3. Bound the entire chain: sink queues, callback ingress, scheduler/prefetch, event sizes, transport output, and subscriber count. Reactive Streams demand does not automatically slow a UDP source, callback producer, or remote device. A bound on one queue is not an end-to-end memory bound.
4. For snapshots, dropping intermediate versions may be correct if clients can detect gaps and re-read. For commands/audit events, silent loss is not correct: fail with a recoverable signal or use the existing durable mechanism. Do not promise durability from an in-memory sink.
5. Serialize concurrent producers according to the sink API. Inspect `tryEmitNext` results: `FAIL_NON_SERIALIZED` means contention, `FAIL_OVERFLOW` means a capacity/demand policy failure, and cancelled/terminated/no-subscriber cases need distinct handling. Never ignore all failures, spin indefinitely, or blindly retry side effects.
6. On terminal source failure, decide whether to terminate that subscriber or reconnect with bounded backoff and a reconciliation/resume step. Retrying a publisher may install duplicate listeners or replay stale values; a terminated shared sink does not recover by emitting again.
7. Release registrations, timers, and per-subscriber state on completion, error, and cancellation. Do not let cleanup exceptions escape dropped-signal hooks or mask the original failure; record cleanup failure safely once.

Lifecycle fragment; `watches.open` is an application adapter that must provide a bounded stream, atomically manage snapshot/watch registration if promised, and roll back partial registration on failure:

```java
return Flux.defer(() -> {
    var registration = watches.open(linkId);
    return registration.events()
            .map(mapper::toGql)
            .doFinally(registration::closeSafely);
});
```

Here `closeSafely(SignalType)` is an application method that performs idempotent, non-throwing listener removal, including cancellation. For asynchronous cleanup use an established `usingWhen`/resource-lifecycle adapter instead of fire-and-forget work in `doFinally`. Tests must prove cleanup, not merely assert that this operator appears in code.

## Snapshot and confirmation races

**Snapshot plus watch:** `readSnapshot().concatWith(watch())` can lose an update between the read and listener registration. Register and capture the snapshot under the same synchronization/version boundary, or register first, buffer boundedly, capture a revisioned snapshot, and discard/deduplicate events already covered by it. Emit immutable snapshots so later mutation cannot rewrite previously published state. Test an update precisely inside the read/register window.

**One-shot confirmation:** construct and activate the confirmation listener before dispatching a command that can complete immediately. Creating a lazy Flux is not enough: `sendCommand().then(awaitConfirmation())` can subscribe too late. Establish the watch, correlate by command ID or post-command generation/revision, dispatch, then await the target predicate with timeout and cleanup. An old replayed value already matching the target does not prove this command succeeded. Distinguish an intentional idempotent no-op from fresh confirmation, and avoid satisfying one request with another request's update. On timeout, report the documented unknown/failed outcome rather than claiming the device rolled back.

## Authorization and transport security

Classify every operation and sensitive nested field as **public**, **authenticated**, **authority-protected**, and/or **resource-owned**. Public must be explicit, not the accidental absence of an annotation. Standard imports are `org.springframework.security.access.prepost.PreAuthorize` and `org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity`; activate method security on configuration for the imperative examples above. Reactive method security requires its appropriate configuration and reactive security context; a Flux return alone does not choose the application's security model.

- `@PreAuthorize("isAuthenticated()")` checks authentication; `hasAuthority('link:read')`/`hasAuthority('link:write')` check granted authorities, not ownership. The service must additionally verify the resource belongs to the caller's authorized tenant/scope before reading, watching, or commanding it.
- Secure the shared service entry point when REST, jobs, or other controllers can call it. Spring proxy self-invocation bypasses proxy advice; test the actual bean/call path. Preserve checks before side effects, not after a command has been sent.
- `@RequiresPermission` is not a standard Spring annotation. Use it only if the project defines and tests its actual enforcement; do not invent a permission annotation or depend on reflection scanning alone.
- An all-protected HTTP GraphQL endpoint can require authentication at the transport. If public and protected fields share an endpoint, narrowly allow that endpoint through the transport as needed while enforcing field/service authorization during real execution. Retain restrictive rules for unrelated routes; never make global `permitAll` the template.
- Do not authorize by searching query text for field names or `mutation`. Aliases, fragments, directives, multiple operations, `operationName`, and mixed public/protected fields require parsed execution and actual resolver/service checks. An AST policy may supplement those checks, not replace them with substring matching.
- HTTP and WebSocket authentication are separate integration paths. Validate the handshake/connection-init mechanism actually used, propagate its principal into each execution and asynchronous continuation, and never trust a client-supplied user/tenant ID as identity. Browser WebSockets cannot universally send arbitrary handshake headers.
- Define subscription lifetime security: token expiry, logout, revocation, authority changes, and ownership loss must trigger revalidation/termination according to policy. A connection-time check alone does not enforce later revocation. Test cancellation and listener cleanup when access is withdrawn.
- Restrict HTTP CORS and WebSocket origins independently to intended origins. Cookie/session authentication needs CSRF protections, including mutations; explicit bearer-only policies differ (see [REST security](rest-api-patterns.md#security-boundaries)). Neither wildcard origins nor globally disabled CSRF is a safe default.
- Apply introspection/GraphiQL exposure, document size, depth/complexity, aliases, timeouts, rate/concurrency limits, and subscription quotas proportionally to exposure. Reuse existing gateway/security/GraphQL Java instrumentation; inspect available APIs before adding dependencies. Disabling introspection does not provide authorization or bound query cost.

## Errors and verification

Use composable known-error resolvers and safe stable `extensions.code`; leave unknown exceptions unresolved for later resolvers/framework fallback. Data fetching and subscription publisher failures are different phases; see [Exception Handling](exception-handling.md#graphql-error-phases). Do not expose arbitrary exception messages or claim Bean Validation always produces a predefined GraphQL error shape.

Before delivery, verify:

- Schema loads and all fields, arguments, enums, scalars, and nullability map correctly; test omitted/null/value inputs and nested validation.
- `GraphQlTester` covers query/mutation data, partial errors and non-null bubbling; async failures retain their causes and safe codes.
- Real HTTP/WebSocket tests cover anonymous, wrong authority, wrong owner, mixed public/protected operations, aliases/fragments, selected `operationName`, expiry/revocation, and principal propagation. Direct controller calls cannot prove method security.
- Nested collections stay bounded and batching reduces actual I/O rather than just changing annotations.
- Reactor tests cover late subscribers, no demand/slow consumers, overflow, concurrent emissions, source failure, fresh confirmation, races, timeout, cancellation, and listener counts returning to baseline.
- Mock command completion is not reported as transport/hardware verification. See [Testing](testing.md) and [Complete Examples](complete-examples.md).

## References

Consult the documentation matching the resolved versions:

- [Spring GraphQL annotated controllers](https://docs.spring.io/spring-graphql/reference/controllers.html): binding, `ArgumentValue`, validation, batch mappings.
- [Spring GraphQL execution](https://docs.spring.io/spring-graphql/reference/request-execution.html): completion stages, batching, error phases, subscription ordering.
- [Spring GraphQL security](https://docs.spring.io/spring-graphql/reference/security.html) and [Spring Security method security](https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html).
- [Reactor sinks](https://projectreactor.io/docs/core/release/reference/coreFeatures/sinks.html): demand, concurrency, and emission results.
