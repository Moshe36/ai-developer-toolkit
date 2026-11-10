---
name: backend-dev-guidelines
description: Design, implement, debug, test, and review Java/Spring backend changes. Use for Spring Boot REST or GraphQL APIs, services, persistence, authorization, asynchronous commands, subscriptions, configuration, validation, caching, DTO/MapStruct mappings, and framework migrations. Follow the repository's actual Java version, Boot 3/4 dependencies, and execution model. Not for frontend-only GraphQL/Apollo work or non-Java backends.
---

# Backend Development Guidelines

Deliver a verifiable Java/Spring backend change that preserves the application's contracts. Use the existing architecture and installed tools; examples illustrate responsibilities, not mandatory layers or dependencies.

## Contents

- [Discover before designing](#discover-before-designing)
- [Deliver a vertical slice](#deliver-a-vertical-slice)
- [Select resources by task](#select-resources-by-task)
- [Implementation gates](#implementation-gates)
- [Verification and handoff](#verification-and-handoff)

## Discover before designing

Read repository instructions and the code the change reaches. Record only the facts relevant to the task:

| Discover | Evidence to inspect | Decision it controls |
|---|---|---|
| Java and framework baseline | Parent/BOM, compiler release, build wrapper, installed JDK | Language features, API availability, dependency and import compatibility |
| API contract | GraphQL schemas, REST routes, DTOs, existing clients | Nullability, naming, compatibility, status/error semantics |
| Authorization | HTTP filters, method security, WebSocket interceptors, principal/session model | Public access, permissions, resource ownership, revocation |
| State and persistence | Repository implementations, migrations, datasource configuration | Authoritative versus derived state, durability, transactions |
| Runtime execution | Executors, schedulers, futures, Reactor chains, startup/shutdown hooks | Blocking boundaries, ordering, cancellation, admission limits |
| Integration reality | Concrete transport code, parser, mocks, TODOs | Actual wire behavior, retry safety, timeout and recovery guarantees |
| Verification | Tests, fixtures, Maven/Gradle configuration, CI | Which checks run, required infrastructure, test discovery |

Trace an existing path from entry point to state/external effect and back. Search callers before changing shared code. Include affected schemas, generated-code inputs, tests, fixtures, configuration, and consumers in scope.

Distinguish **declared**, **implemented**, **tested in source**, and **executed successfully**. A dependency does not prove a feature is used; a README or test file does not prove a guarantee holds. Resolve contradictory requirements before coding. Do not copy credentials, private endpoints, or production data into examples or fixtures.

For a bug, reproduce the failure or identify a concrete failing path before changing shared code. For a review, trace connected callers and report actionable findings with file/line evidence; edit only when requested. Ask a focused question only when code and requirements cannot resolve a decision that changes correctness or compatibility.

Read only the task-relevant sections below. Start with one primary resource; add another when the change crosses its boundary. Do not load every reference for a small fix.

## Deliver a vertical slice

1. **Define behavior:** input, output, authorization, invariants, failure and completion semantics, compatibility constraints.
2. **Choose verification:** at least the successful path and the relevant denied/invalid/failure path; add race and recovery cases when state or asynchronous work is involved.
3. **Implement end to end:** schema/API → application service → domain/state/integration → response/events → tests. Add only the layers that have a responsibility.
4. **Verify the boundary:** exercise framework behavior through the framework when testing validation, security proxies, serialization, or transport handling.
5. **Reconcile:** update callers, fixtures, documentation, and configuration affected by the behavior. Report actual checks and unresolved limits.

Keep the system usable between slices. Do not build every DTO, then every repository, then every controller and postpone integration until the end.

## Select resources by task

| Task | Required decisions | Resource |
|---|---|---|
| New feature | Capability owner, feature-local files, first end-to-end slice, wiring and tests | [New-feature walkthrough](resources/project-structure.md#add-a-new-feature) |
| Connected implementation example | Schema, local state, mapping, authorization, errors, and tests | [Complete feature](resources/complete-examples.md) |
| Query or REST read | Ownership, nullable/not-found behavior, bounded results, N+1/cost, safe output | [GraphQL](resources/graphql-patterns.md), [REST](resources/rest-api-patterns.md) |
| Local state mutation | Invariants, atomic update, concurrency policy, persistence and publication ordering | [Core patterns](resources/core-patterns.md) |
| External command | Accepted/ACK/confirmed meaning, deadline, idempotency, conflict scope, partial failure | [Async recipe](resources/core-patterns.md#async-operation-pattern), [configuration](resources/configuration.md) |
| Subscription or observation | Resource scope, initial snapshot, replay, loss, ordering, demand, cleanup, access lifetime | [GraphQL](resources/graphql-patterns.md) |
| Persistence | Actual storage technology, schema, parameter binding, transactions, restart behavior | [Core patterns](resources/core-patterns.md) |
| DTO or mapping | Boundary purpose, immutable/mutable semantics, null/absence, enum compatibility | [DTOs and mapping](resources/dto-and-mapping.md) |
| Lombok | Constructor wiring, generated API, identity, builders, secret-safe output | [Lombok guide](resources/lombok-guide.md) |
| Validation | Constraint types, nested inputs, method proxies, cross-field rules | [Validation](resources/validation-and-caching.md#constraint-types-and-nullability) |
| Cache | Whether it is expendable, isolation key, invalidation, size/TTL, immutable values | [Validation and caching](resources/validation-and-caching.md) |
| Error handling | Domain versus framework failure, transport, safe public code, resolver composition | [Exception handling](resources/exception-handling.md) |
| Configuration or runtime setup | Binding, defaults, validation, secrets, resource ownership and lifecycle | [Configuration](resources/configuration.md) |
| Framework migration | Effective dependency changes, imports/processors, serialization, source and test compatibility | [Configuration](resources/configuration.md), [testing](resources/testing.md) |
| Tests or regression diagnosis | Smallest boundary that proves the behavior, deterministic failures, test discovery | [Testing](resources/testing.md) |

Match all imports, starters, annotation processors, and client APIs to the resolved stack. Boot 4 changes test packages and defaults to Jackson 3; existing application mappers may still use Jackson 2. Consult release-matched official documentation when an API is uncertain. Upgrade dependencies only when the task requires it.

## Implementation gates

Apply the gates touched by the change; they are not a request to audit unrelated features.

### API and security

- Keep controllers/adapters thin; they bind and validate inputs, enforce the chosen access policy, delegate, and project the result.
- Explicitly choose public, authenticated, permission-protected, and resource/session-owner access. Authentication and nonblank client IDs do not establish ownership.
- Use existing security infrastructure. Standard `@PreAuthorize` requires enabled method security and proxy-based invocation; annotations on a directly constructed object are not enforcement.
- Treat HTTP and WebSocket authentication separately. Define how principal propagation, expiry, logout, and permission changes affect established subscriptions.
- Preserve schema/route and error compatibility. Validate strings, enums, numeric ranges, nested inputs, and absent-versus-null semantics correctly.
- Never expose internal state, credentials, exception details, or unrestricted datasets by accident. Add negative authorization tests.

### Domain, state, and mapping

- Identify the owner and lifetime of durable data, observed state, sessions, and disposable caches. Do not introduce a cache to compensate for an undefined source of truth.
- Preserve existing package conventions. For new feature-local organization, put each feature's layers together; extract shared infrastructure only when it is genuinely shared.
- Name domain predicates and transitions so orchestration reads as a use case; keep wire parsing and low-level comparisons in their owning methods.
- Use constructor injection; prefer explicit constructors where qualifiers, resource ownership, or initialization matter.
- Use immutable values/snapshots where appropriate. Records are suitable for domain and REST values too, but do not make nested lists or objects immutable.
- A concurrent collection protects individual operations, not cross-entry invariants or mutation-plus-event atomicity. Define ordering and stale-generation behavior.
- Enforce durable invariants with store-level constraints/transactions. A database rollback cannot undo a remote side effect; define recovery when a change spans both.
- Use existing MapStruct mappings when present. Fail on unintended unmapped target fields, handle intentional omissions explicitly, and test enum/null/update behavior.
- Do not add a JPA entity, repository interface, DTO layer, builder, or new dependency merely because a template contains one.

### Asynchronous work and integrations

- State whether completion means queued, accepted, acknowledged, or confirmed by observed state. Requested state is not automatically observed state.
- Define one coherent deadline or explicitly budget each stage. A timed-out future does not prove the worker stopped or an external command was not delivered.
- Specify cancellation ownership and conflict release. Do not admit conflicting work while an earlier operation may still mutate the same resource.
- Retry only with a transport-specific non-delivery argument or an idempotency guarantee. Bound attempts and delay; preserve interruption and causes.
- Every executor, scheduler, task registration, listener, and transport needs an owner and startup, rejection, cancellation, and shutdown behavior.
- Virtual threads are an execution choice, not a concurrency limit. Set admission/resource bounds independently and keep blocking work off reactive event loops.
- Separate latest snapshots, fresh observations, and durable events. Choose replay/buffering/loss deliberately; handle concurrent emissions, cancellation, and publication failures.
- Callbacks can reenter, block, or throw. Avoid invoking untrusted callbacks while holding state locks; preserve ordering with an explicit design.
- For datagrams, validate framing, size, truncation, opcode, and payload before domain mutation; define queue saturation and partial-start cleanup.

### Errors and operations

- Reuse meaningful domain exceptions and stable public error codes; do not make every programming error a not-found or validation error.
- REST advice, GraphQL data-fetching errors, and subscription publisher failures are different boundaries.
- Feature resolvers handle known failures and leave unknown ones for other resolvers. Put any sanitized terminal fallback deliberately last.
- Log a failure at the responsible boundary with safe structured context. Avoid log-every-get boilerplate, duplicated stack traces, and whole-config dumps.
- Use existing correlation/observability facilities across asynchronous boundaries where needed. Actuator presence is not proof of domain metrics or durable auditing.

## Verification and handoff

Before completion:

- Compile affected production **and test** code; run focused regression tests and the suite/package checks required by the change and repository. For prose-only edits, use structural checks instead of an application build.
- Verify annotation processing, schema/DTO compatibility, denied access, invalid inputs, and failure paths relevant to the slice.
- For asynchronous/stateful changes, verify timeout, cancellation, late completion, ordering, slow consumers, and cleanup—not only the happy path.
- Check that tests were discovered and report skipped/disabled tests. A coverage report is not an enforced coverage threshold.
- Use isolated test fixtures, ephemeral resources, and controlled credentials; do not clean up a production store or rely on production credential files.
- Report checks actually executed, observed results, environment blockers, compatibility limits, and deferred work. Do not call inspection a passing runtime test.

Finish with the behavior changed, verification results, and remaining blockers or compatibility decisions. Keep discovery notes proportional to the task. For skill edits, use the [maintenance evaluations](resources/testing.md#skill-maintenance-evaluations).
