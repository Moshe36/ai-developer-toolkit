# Project Structure

Organize a Java/Spring backend around business capabilities, clear ownership, and verifiable runtime boundaries. Adapt the layout to the repository; do not reorganize an established application merely to match a diagram.

## Table of Contents

- [Package by feature](#package-by-feature)
- [Command feature file map](#command-feature-file-map)
- [Add a new feature](#add-a-new-feature)
- [Responsibilities and dependency direction](#responsibilities-and-dependency-direction)
- [Resources and tests](#resources-and-tests)
- [Structure review](#structure-review)

## Package by feature

For new applications, group code by capability under `feature/<domain>`; each feature owns its technical layers. Extend existing applications using their package conventions, including established layer-based layouts. The command feature map below shows possible participants, not a scaffold to generate.

- Preserve existing singular/plural names and nested feature conventions when extending code.
- Keep small features small: a controller and service do not require empty repository or mapper packages.
- Add `client`, `stream`, `operation`, or `scheduler` packages when they describe a real responsibility already present or needed by the slice.
- Keep enums with the feature/model they describe, not in an application-wide enum bucket.
- Extract shared code only when its ownership and consumers are genuinely cross-feature. Avoid a `utils` or `common` dumping ground.

Package boundaries are a navigation aid, not automatic architectural enforcement. Use package-private visibility where practical; introduce module or architecture checks only when the project needs stronger enforcement.

## Command feature file map

For a capability such as changing device transmission power, this shows the placement of all possible participants. Paths below `feature/power` are feature-local; add them only when their responsibility is required. The names are illustrative, not extra classes to create beside an existing system-parameters feature.

```text
src/main/java/<base-package>/
├── feature/
│   ├── power/
│   │   ├── controller/PowerController.java
│   │   ├── service/PowerService.java
│   │   ├── repository/PowerRepository.java
│   │   ├── model/PowerSnapshot.java
│   │   ├── model/TransmissionPower.java
│   │   ├── dto/SetPowerInput.java
│   │   ├── dto/PowerGql.java
│   │   ├── mapper/PowerMapper.java
│   │   ├── operation/PowerOperation.java
│   │   ├── stream/PowerStream.java
│   │   ├── config/PowerProperties.java
│   │   ├── exception/PowerUnavailableException.java
│   │   └── handler/PowerGraphQlExceptionResolver.java
│   └── operation/                     # If this shared application capability already exists
│       ├── model/OperationType.java
│       └── service/OperationService.java
└── infrastructure/
    ├── device/DeviceClient.java       # Reuse the actual client; do not duplicate it per feature
    └── config/AsyncConfig.java        # Shared managed execution resources

src/main/resources/
├── graphql/power.graphqls
└── application.yml                   # Feature settings only if this slice needs them

src/test/java/<base-package>/feature/power/
├── controller/PowerControllerGraphQlTest.java
├── service/PowerServiceTest.java
├── repository/PowerRepositoryTest.java
├── mapper/PowerMapperTest.java
└── stream/PowerStreamTest.java
```

| File/owner | Add or extend it when | Keep out of it |
|---|---|---|
| Controller + schema | Exposing the feature's query, mutation, or subscription | Worker creation, retry loops, polling, business predicates |
| Service | Coordinating the use case and its permission/ownership, preconditions, and completion rule | GraphQL error construction or HTTP status logic |
| Repository | The feature owns state/observations or needs a distinct persistence projection | Assuming a device ACK is observed state or inventing a database |
| Model + DTO + mapper | There is domain meaning or a real public/external contract boundary | Duplicated identical representations without a reason |
| Operation enum | Commands participate in the existing coordinator's conflict/deadline policy | A private duplicate coordinator, executor, or retry implementation |
| Stream | Subscription lifecycle/projection differs from the repository's raw observations | An unbounded event queue or leaked listener |
| Config + exception + handler | The feature introduces a real setting, domain failure, or public translation | A second global security configuration or a catch-all handler per feature |
| Shared client/coordinator | Existing infrastructure lacks a necessary transport method or execution capability | The power-specific target predicate or API DTO |

Feature identity and operation identity are not the same thing: a capability can have several commands, each with a separate conflict/completion contract. Sub-resource scope matters too; commands for two RF heads may need a finer key than device ID. Inspect the actual shared coordinator instead of assuming its key or exclusivity flag provides the required isolation.

## Add a new feature

### 1. Locate the capability and reference path

Search the existing schema, feature packages, service callers, client API, permission catalog/policy, and tests. If the behavior already belongs to `systemparams` or `network`, extend that feature rather than introducing a competing `power` state owner. For a genuinely new capability, choose `feature/<domain>` and mirror its test packages.

Write the concrete use case before its files. Example: “An authorized caller changes a connected device's power; the mutation completes only after a fresh observation reports the target, or returns the documented busy/timeout/failure result.” State whether the caller can address every device or only an owned session/resource.

### 2. Choose the execution contract

| Use case | Execution path |
|---|---|
| Read local state | Controller → service → existing state owner → projection |
| Change authoritative local state | Controller → service → atomic state mutation/transaction → stored result |
| Command with final response/follow-up | Controller → service → shared coordinator `execute` equivalent → bounded response handling |
| Command requiring observed confirmation | Controller → service → shared coordinator `executeConfirmed` equivalent; independent ingestion supplies confirmation |
| Subscription | Controller → authorized feature watch → bounded projection → cancellation cleanup |

The coordinator names are example application APIs, not Spring methods. Use the existing equivalent; the [async recipe](core-patterns.md#async-operation-pattern) explains its required contract.

### 3. Implement and verify one complete slice at a time

The following progression is for a new remote-control feature. Every row must be integrated and testable before widening it; it is not “all models, then all services.” Existing observation infrastructure can make the first slice unnecessary.

| Slice | Files touched together | Acceptance check |
|---|---|---|
| Observe current power | Required client read/event adapter, model, repository, service, query/schema, output mapper, corresponding tests | An authorized caller sees actual observed state; missing/stale/denied behavior is explicit; no command is sent |
| Set one power value | Mutation/input/schema, feature operation type, service command supplier + named confirmation predicate, client command method, error mapping/policy and tests | ACK alone does not complete it; fresh target observation does; invalid/denied/conflicting requests have no unintended side effect |
| Publish updates, if requested | Subscription/schema, feature stream adapter if needed, ownership policy and stream/transport tests | Initial-value/replay contract is accurate; slow-consumer policy is bounded; cancellation/expiry releases registrations |

Include required configuration, lifecycle, timeout, and concurrency handling in the slice that introduces the resource or command. These are acceptance conditions for that slice, not a deferred hardening phase. Use controlled ACK/observation sources and real proxies/transports for the guarantees under test.

### 4. Check registration and integration points

- Ensure component scanning includes the feature and generated mapper implementations; do not add redundant `@ComponentScan` to conceal package placement errors.
- Ensure the configured GraphQL locations discover the feature schema and root/enum/scalar contracts remain consistent.
- Register new configuration properties using the host's scanning or enablement convention and test their defaults/validation.
- Extend the existing permission catalog/RBAC policy or standard authority checks **only if the operation introduces a new permission**; verify enforcement, not merely declaration.
- Add only required transport commands/reads and test wire/error behavior. A mock implementation does not finish production integration.
- Connect polling/events and lifecycle cleanup to the actual state owner. Async fixed-delay dispatch may overlap; prove the chosen single-flight/conflict rule.
- Update fixtures, public API documentation, frontend contract consumers, and deployment settings affected by the new behavior. Do not create unrequested unrelated artifacts.

**Definition of done:** the feature is reachable through its real entry point, permitted callers can complete the promised use case, denied/invalid callers cannot cause effects, state reflects the chosen source of truth, and failure/concurrency/shutdown paths have verification evidence. A new directory tree or a future-returning method alone is not a completed feature.

## Responsibilities and dependency direction

Typical request path:

```text
Transport adapter → application service → domain/state owner or external client
                        ↓
                 domain result/snapshot → boundary mapping → transport result
```

| Area | Owns | Does not own |
|---|---|---|
| Controller | Transport binding, boundary validation, caller context, response mapping | Conflict arbitration, device protocols, database queries |
| Service | Authorization-sensitive use cases, invariants, orchestration, completion semantics | HTTP status codes or GraphQL error formatting |
| Model | Domain meaning, valid transitions, value/snapshot representation | Spring transport binding and persistence plumbing by default |
| Repository | Access and atomic updates to explicitly owned state | An assumption that all state is durable or authoritative |
| Client/adapter | Wire protocol, serialization, bounded I/O, protocol errors | Claiming that an ACK proves domain completion |
| Mapper | Explicit representation conversion | Sending commands, allocating domain identity, enforcing permissions |

Controllers should be thin, but services need not form a rigid controller → service → database chain. A discovery use case can call a transport adapter and publish snapshots without a database. A scheduled job should call the same application boundary as a transport adapter when it performs the same use case.

Cross-feature access should use a deliberate application/domain API rather than reaching into another feature's mutable maps or transport DTOs. Avoid circular service dependencies; they often indicate unclear ownership or an orchestration responsibility that belongs elsewhere. Do not add an interface for every class solely to imitate layers.

Transport details belong in [graphql-patterns.md](graphql-patterns.md) and [rest-api-patterns.md](rest-api-patterns.md); failure translation belongs in [exception-handling.md](exception-handling.md).

Place state owners with their capability and shared technical resources under existing infrastructure. Use [core patterns](core-patterns.md#state-ownership-and-repository-contracts) for state contracts, [DTO and mapping](dto-and-mapping.md) for representation boundaries, and [configuration](configuration.md#executors-scheduling-and-lifecycle) for resource ownership.

## Resources and tests

Keep the application's established resource-loading rules:

```text
src/main/resources/
├── application.yml
├── application-<profile>.yml     # Only profiles actually used
├── graphql/                    # If GraphQL is implemented
│   └── schema.graphqls
└── db/migration/                # If the configured migration tool uses this path

src/test/java/com/example/backend/feature/device/
├── service/DeviceServiceTest.java
└── repository/DeviceRepositoryTest.java
```

GraphQL schema files may be split by feature/type if the configured schema locations discover them. Do not assume arbitrary nested files are loaded; verify startup and schema tests. Migration locations are tool configuration, not a universal Spring convention. Do not package writable production databases, credentials, or deployment-specific absolute paths as source resources.

Mirror production package boundaries in tests. Put reusable fixtures in test scope, not production utility packages. Match tests to actual capabilities: an in-memory observation repository needs concurrency/lifecycle tests, not fabricated JPA tests. See [testing.md](testing.md).

## Structure review

- Does the proposed layout preserve the repository's conventions and feature ownership?
- Can a reader locate the transport, use case, state owner, and cleanup path together?
- Is each state store labeled durable, observed, session, cache, or coordination state?
- Are database/REST/JPA recommendations conditional on actual implementation and dependencies?
- Are dependency direction and cross-feature access deliberate, without circular wiring?
- Are configuration, schemas, migrations, tests, and resource lifetimes included in the slice?
- Have declared versions been distinguished from resolved dependencies and runtime evidence?
