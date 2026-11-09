# Backend Testing

Test a behavior at the cheapest boundary that can prove it, then add integration coverage for wiring, security, concurrency, and actual transports. A green mocked service test cannot prove a proxy, schema, socket, transaction, or authentication interceptor works.

## Table of Contents

- [Inspect the test baseline](#inspect-the-test-baseline)
- [Boot 3 and Boot 4 compatibility](#boot-3-and-boot-4-compatibility)
- [Plain unit tests](#plain-unit-tests)
- [Validation, configuration, and proxy tests](#validation-configuration-and-proxy-tests)
- [REST execution slices](#rest-execution-slices)
- [GraphQL execution slices and schema contracts](#graphql-execution-slices-and-schema-contracts)
- [Transport and security integration](#transport-and-security-integration)
- [Deadlines, ACKs, retries, and cancellation](#deadlines-acks-retries-and-cancellation)
- [Reactive streams and deterministic coordination](#reactive-streams-and-deterministic-coordination)
- [UDP and lifecycle tests](#udp-and-lifecycle-tests)
- [State, caches, and repositories](#state-caches-and-repositories)
- [Verification commands and honest reporting](#verification-commands-and-honest-reporting)
- [Skill maintenance evaluations](#skill-maintenance-evaluations)

## Inspect the test baseline

Before writing imports or commands, read the parent/BOM, declared Java release, wrapper, Surefire/Failsafe setup, test engines/starters, compiler processors, existing test fixtures, and production runtime path. Check which JDK Maven actually uses. Determine whether the repository is servlet or reactive, how GraphQL reaches its interceptors, which JSON mapper family is active, and whether repositories are in-memory, file-backed, or database-backed.

## Boot 3 and Boot 4 compatibility

Select imports from the installed version, not an IDE's first suggestion. The Boot 4 modularization moved slice annotations and introduced feature test starters. Common testing support still includes `org.springframework.boot.test.context.SpringBootTest`, `org.springframework.boot.test.context.runner.ApplicationContextRunner`, and `org.springframework.boot.test.context.TestConfiguration`.

| Annotation | Boot 3 import | Boot 4 import |
|---|---|---|
| `WebMvcTest` | `org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest` | `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest` |
| `AutoConfigureMockMvc` | `org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc` | `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc` |
| `WebFluxTest` | `org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest` | `org.springframework.boot.webflux.test.autoconfigure.WebFluxTest` |
| `GraphQlTest` | `org.springframework.boot.test.autoconfigure.graphql.GraphQlTest` | `org.springframework.boot.graphql.test.autoconfigure.GraphQlTest` |
| `AutoConfigureHttpGraphQlTester` | `org.springframework.boot.test.autoconfigure.graphql.tester.AutoConfigureHttpGraphQlTester` | `org.springframework.boot.graphql.test.autoconfigure.tester.AutoConfigureHttpGraphQlTester` |
| `RestClientTest` | `org.springframework.boot.test.autoconfigure.web.client.RestClientTest` | `org.springframework.boot.restclient.test.autoconfigure.RestClientTest` |
| `JdbcTest` | `org.springframework.boot.test.autoconfigure.jdbc.JdbcTest` | `org.springframework.boot.jdbc.test.autoconfigure.JdbcTest` |
| `DataJpaTest` | `org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest` | `org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest` |
| `ValidationAutoConfiguration` | `org.springframework.boot.autoconfigure.validation.ValidationAutoConfiguration` | `org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration` |

| Need | Boot 3 test dependencies | Boot 4 test dependencies |
|---|---|---|
| General JUnit/Mockito/AssertJ support | `spring-boot-starter-test` | `spring-boot-starter-test` (often supplied transitively by feature test starters) |
| Servlet MVC slice | general test starter plus installed MVC runtime | `spring-boot-starter-webmvc-test` |
| WebFlux slice | general test starter plus installed WebFlux runtime | `spring-boot-starter-webflux-test` |
| GraphQL slice/tester | general test starter + `org.springframework.graphql:spring-graphql-test` | `spring-boot-starter-graphql-test` |
| Security helpers | `org.springframework.security:spring-security-test` | `spring-boot-starter-security-test` |
| Validation-focused support | general test starter + validation runtime/provider | `spring-boot-starter-validation-test` and the application's validation runtime/provider |
| JDBC / JPA slices, only when used | general test starter + installed JDBC / JPA runtime | `spring-boot-starter-jdbc-test` / `spring-boot-starter-data-jpa-test` |
| Blocking HTTP client slice | general test starter + installed client runtime | `spring-boot-starter-restclient-test` |
| Reactor assertions | `io.projectreactor:reactor-test` | `io.projectreactor:reactor-test` |

Boot starter coordinates in the table use group `org.springframework.boot`; all test dependencies have test scope. Inspect transitive dependencies before adding redundant starters. A GraphQL test dependency does not alone guarantee the HTTP client/WebSocket implementation required by a transport test is available.

Use `org.springframework.test.context.bean.override.mockito.MockitoBean` for Spring-context mock overrides on **Spring Framework 6.2+**, including Boot 3.4+ and Boot 4. Boot's `@MockBean` (`org.springframework.boot.test.mock.mockito.MockBean`) was deprecated in Boot 3.4 and **removed in Boot 4**. Older Boot 3 releases on Framework 6.0/6.1 need their supported `@MockBean`, not `@MockitoBean` copied from newer examples. Plain unit tests still use Mockito `@Mock` or `mock(...)`; neither annotation overrides a Spring bean by itself.

Jackson 2 uses `com.fasterxml.jackson.databind.ObjectMapper`; Jackson 3 uses `tools.jackson.databind`/`tools.jackson.core`, while annotations remain `com.fasterxml.jackson.annotation`. Inspect the mapper actually wired into each API/protocol. A Boot 4 build can contain intentional Jackson 2 application mappers alongside Jackson 3 dependencies. Do not mechanically rename test imports or assume `new ObjectMapper()` reproduces application serialization modules.

## Plain unit tests

Use real records/domain values and mock external collaborators. Prefer explicit constructors when they make dependencies clear; `@InjectMocks` is optional, not a test architecture. Mockito annotations require `MockitoExtension` or managed initialization/cleanup; manual `mock(...)` does not require the extension.

See the [repository unit tests](complete-examples.md#unit-tests) for immutable-state, missing-resource, and failed-update assertions against production behavior.

Test **one behavior**, not one assertion. Multiple related assertions describe a returned snapshot or error contract well. Name the scenario/outcome, use arrange/act/assert separation when helpful, and avoid shared mutable fixtures across tests.

Use argument captors for the outgoing command/state that matters. Verify absence of a write/send on rejected input, or exact ordering when ordering is itself a safety requirement. Do not impose universal `verifyNoMoreInteractions`: it makes harmless implementation changes fail and is not a substitute for outcome assertions. `verify(mock).method()` already means once; redundant `times(1)` and no-op void stubbing add little.

## Validation, configuration, and proxy tests

Use three separate proofs where applicable:

1. A direct `Validator` test proves constraints on an input object, including nested elements and class-level rules.
2. A controller/GraphQL execution test proves argument binding, coercion, validation activation, and error mapping.
3. A Spring-context test of a proxied service proves method validation. A direct `new Service()` test does not run AOP advice.

For `DeviceIdPolicy` from [validation-and-caching.md](validation-and-caching.md), this **Boot 4** context test proves proxy enforcement. Boot 3 uses the validation import from the matrix.

```java
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DeviceIdPolicyTest {
    @Test
    void rejectsBlankIdsThroughTheSpringProxy() {
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(ValidationAutoConfiguration.class))
                .withBean(DeviceIdPolicy.class)
                .run(context -> assertThrows(ConstraintViolationException.class,
                        () -> context.getBean(DeviceIdPolicy.class).requireDeviceId(" ")));
    }
}
```

This assumes default method-validation exception behavior; explicitly configured adapted violations may use a different exception type. Likewise, MVC 6.1+ native method validation is not the same path as service `@Validated` AOP.

Use the binding tests in [configuration.md](configuration.md) for absent nested sections/defaults, explicit unit overrides, and startup rejection. Add invalid zero/negative durations, malformed units, missing required secrets, profile combinations, and non-positive capacity. Check the relevant startup cause, not just “anything failed.” Test allowlisted logging/redaction with nested secrets and sensitive parent sections; assert a synthetic sentinel secret never appears, without using production credentials.

## REST execution slices

Use `@WebMvcTest(Controller.class)` for a servlet controller and `MockMvc`; use the reactive slice/client for WebFlux. Import the actual error advice, validation, converters, and security configuration needed for the behavior. Mock only collaborators outside that slice.

**Boot 4 example**, assuming an existing `DeviceRestController` delegates a GET to `DeviceQueries.requireName(String)` and returns a DTO containing `name`:

```java
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DeviceRestController.class)
class DeviceRestControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean DeviceQueries queries;

    @Test
    void returnsTheDeviceName() throws Exception {
        when(queries.requireName("device-1")).thenReturn("Sensor");

        mvc.perform(get("/api/devices/device-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Sensor"));
    }
}
```

This deliberately does not pretend to configure an application's authentication. For a protected route, import the real relevant security chain and authenticate using its supported test mechanism; add CSRF when that chain requires it. Do not disable filters just to make this sample pass. A default slice security chain is not proof of the production one. Test malformed/invalid body, missing fields, unknown enums, not-found, conflict, and authorization denial; assert no side effect on rejected requests. Assert a `Location` header only if the controller's actual creation contract sets it.

## GraphQL execution slices and schema contracts

`@GraphQlTest` configures GraphQL **execution**, not an HTTP server. Inject `org.springframework.graphql.test.tester.GraphQlTester` (typically backed by execution infrastructure), **not `HttpGraphQlTester`**. An execution slice does not prove HTTP filters, WebSocket handshake/authentication, or transport interceptors run.

**Boot 4 example**, assuming the application's schema contains `type Query { deviceName(id: ID!): String! }` and an existing `DeviceQueryController` delegates to `DeviceQueries.requireName(String)`:

```java
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.graphql.test.autoconfigure.GraphQlTest;
import org.springframework.graphql.test.tester.GraphQlTester;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.mockito.Mockito.when;

@GraphQlTest(DeviceQueryController.class)
class DeviceQueryControllerTest {
    @Autowired GraphQlTester graphQl;
    @MockitoBean DeviceQueries queries;

    @Test
    void resolvesTheRequestedDevice() {
        when(queries.requireName("device-1")).thenReturn("Sensor");

        graphQl.document("query($id: ID!) { deviceName(id: $id) }")
                .variable("id", "device-1")
                .execute()
                .path("deviceName").entity(String.class).isEqualTo("Sensor");
    }
}
```

Use the application's real schema, scalar wiring, mappers, exception resolvers, and enum values; mock a mapper only when mapping is outside the behavior being tested. A slice does not component-scan every `@Configuration`/service automatically: explicitly import required wiring, without importing unrelated startup/transport work.

- Assert successful data and absence of unexpected errors. For failures, assert error path and stable `extensions` classification; do not rely solely on a substring in a message.
- Test missing and explicit-null input separately, list versus element nullability, Java/schema enum parity, custom scalar parsing/serialization/range, and non-null propagation. Unknown enum input may fail coercion before the resolver runs; verify no side effect.
- Use variables/document fixtures for normal queries. For presence tests, remember `Map.of` rejects null values; build a map that can represent an explicit null, or use an explicit GraphQL `null` literal.
- Include fragments, aliases, named operations, multiple operations with `operationName`, and mixed public/protected selections in security tests. Do not classify a document as safe merely because one selected field is public.
- Subscription execution tests prove resolver/publisher behavior. They do not prove the WebSocket protocol, credentials from connection initialization, connection closure, or session cleanup.

## Transport and security integration

Use `@SpringBootTest(webEnvironment = RANDOM_PORT)` for the actual server path. For HTTP GraphQL, use `HttpGraphQlTester` with the matching `@AutoConfigureHttpGraphQlTester` when supported/wired, or an explicitly constructed installed HTTP client with connect/request bounds. For subscriptions and WebSocket authentication, connect with `WebSocketGraphQlTester` or the installed real WebSocket client. Close the client/tester and owned resources after each test.

Load the real transport filters, GraphQL interceptors, method authorization, error mapping, and session ownership enforcement. A mocked principal/service that bypasses these components cannot prove security. Use isolated synthetic credential/RBAC fixtures and test-only keys; ensure fixture paths cannot fall back to production credentials. Explicitly disable development/security bypass in these tests and assert the resulting denial behavior.

Cover at least:

| Scenario | Required proof |
|---|---|
| Anonymous protected request | Denied by the real chain; no device/write effect |
| Public login/health/introspection | Only the intended public policy is allowed; do not assume introspection must be public |
| Invalid/expired/revoked token | Rejected with stable public error contract |
| Authenticated but insufficient permission | Forbidden; no command sent |
| Mixed public/protected document | A public selection cannot whitelist protected fields |
| Multiple named operations, aliases/fragments | Authorization follows the selected operation and actual fields |
| Supplied client/session ID belongs to another identity | Keepalive, logout, cancellation and subscriptions cannot steal ownership |
| Token/session expiry while connected | New/continuing operations follow the documented expiry policy; cleanup occurs |
| Disconnect/logout/expiry | Session, stream, timers and discovery registrations are released exactly as intended |
| Wrong transport credentials | HTTP headers and WebSocket connection-init credentials are tested independently |

GraphQL execution errors often travel in an HTTP 200 response; assert the GraphQL error and side-effect contract as well as status. Conversely, pre-execution HTTP rejection may have a transport status with no GraphQL data. Do not force one error shape onto every layer. Session expiry tests should advance an injected clock/run a captured cleanup callback where possible, rather than waiting for wall-clock TTLs.

## Deadlines, ACKs, retries, and cancellation

Model the actual operation phases: admission/conflict registration → command submission → transport ACK → observed confirmation → worker exit. Cover these independently, with controlled futures/callbacks rather than a real device or random simulation latency.

- One overall deadline covers all phases; a retry/confirmation must not reset it. Test timeout before start, during submission/ACK, and during confirmation.
- ACK success does not prove the observed state reached the requested value. Confirmation failure/empty completion should have an explicit outcome, not accidental success.
- Hold an uncooperative worker with a test-controlled gate, expire its deadline, and verify a conflicting operation remains rejected until that worker actually exits. A completed timeout future is not proof that the conflict slot is free.
- Caller cancellation must follow the chosen observation-versus-execution contract; test that it does not prematurely release a running operation, or test real worker/transport cancellation if promised. Include interrupted waits and late responses.
- Test retry classification, attempt limits, backoff/deadline exhaustion, fresh submissions, and no retry of validation/permission/domain rejection. Retry a “known not delivered” failure separately from an ambiguous ACK timeout; ambiguous delivery requires an idempotency/deduplication contract.
- Inject executor rejection and partial startup failure; verify registration rollback. Test shutdown refusing new work, bounded waiting, and cleanup when workers ignore interruption.
- Test per-resource conflict matrices and independent operations concurrently. A sequential “submit twice” test does not prove atomic registration under contention.
- Late ACKs/results must not complete a newer operation or overwrite newer observed state without the intended correlation/version policy.

Use bounded `future.get(timeout, unit)`, latch waits, and test-level safeguards. Avoid preemptive timeouts around transaction/thread-local-sensitive code unless the isolation effects are understood. Always release test-controlled gates and close executors/subscriptions in `finally` so a failed assertion does not strand workers.

## Reactive streams and deterministic coordination

Use bounded StepVerifier verification and drive emission from verifier callbacks after subscription. This self-contained example proves replay of the latest immutable snapshot and a subsequent update:

```java
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Sinks;
import reactor.test.StepVerifier;

class SnapshotReplayTest {
    @Test
    void replaysLatestAndThenPublishesUpdates() {
        Sinks.Many<List<String>> sink = Sinks.many().replay().latest();
        sink.tryEmitNext(List.of("initial")).orThrow();

        StepVerifier.create(sink.asFlux())
                .expectNext(List.of("initial"))
                .then(() -> sink.tryEmitNext(List.of("updated")).orThrow())
                .expectNext(List.of("updated"))
                .thenCancel()
                .verify(Duration.ofSeconds(2));
    }
}
```

For production tests, exercise the actual publisher, not just a standalone Reactor sink. Add tests for late subscribers, empty initial state, immutable snapshot ownership, ordering, concurrent emitters, duplicate/coalesced updates if specified, and the actual overflow/failure policy. A latest-snapshot stream is not a durable event log; do not demand replay of every past event unless promised.

Request limited demand to test slow consumers/backpressure. Verify memory/delivery policy rather than assuming a sink name proves bounded behavior. Test cancellation/unsubscribe cleanup, reconnect, completion/error policy, registration after shutdown, and disposal while emission is in progress. Do not emit before a non-replaying source has subscribers and then call the missing update a race-free test.

Use `StepVerifier.withVirtualTime(() -> pipelineCreatedAfterVirtualClockInstallation)` for compatible Reactor timers, with bounded terminal verification. It does not control arbitrary JDK executors, sockets, `Thread.sleep`, or unrelated scheduled futures. For those, inject a clock/scheduler or capture callbacks and trigger them explicitly. A latch must have a bounded await; avoid sleeps and unbounded polling as synchronization.

## UDP and lifecycle tests

Separate parser unit tests, deterministic dispatch/lifecycle tests, and a small real loopback transport integration test. Use an ephemeral loopback port (`0`), bounded receives/futures, local interfaces, and test-owned channels/executors. Do not depend on device hardware, production broadcasts, fixed ports, or a particular network adapter name.

| Boundary | Cases |
|---|---|
| Parser | Empty/short/malformed payload, invalid encoding/version/opcode, inconsistent declared lengths, unsupported values, exact legal boundaries |
| Buffer ownership | Receiver reuse cannot mutate a queued payload; length/offset are honored |
| Truncation | Maximum valid payload, oversize/truncated datagram, full-buffer ambiguity and chosen rejection rule |
| Saturation | Bounded queue/executor rejection, explicit drop/coalesce policy, observable accounting, receiver remains usable |
| Handler failure | One malformed packet/throwing handler cannot poison later valid traffic |
| Startup | Submission rejection and later-channel bind failure roll back running state, channels and registrations |
| Stop | Idle and in-flight stop, repeated stop, owned-resource close, bounded loop exit, no new registration after close |
| Recovery | Explicit restart or automatic retry according to the implemented policy; never assert automatic recovery unless it exists |

Inject a rejecting executor for saturation tests instead of flooding the OS and hoping packets drop predictably. Use a blocked handler gate to prove in-flight behavior. For genuine loopback tests, signal receipt with a bounded latch/future; do not sleep and inspect logs. Confirm both malformed traffic rejection and subsequent valid-message recovery.

## State, caches, and repositories

Test the implementation actually in use:

- **In-memory repository:** create a fresh instance per test. Verify CRUD/lookup, immutable snapshots, atomic update/conflict behavior, observations/replay, and cleanup as appropriate. Direct construction does not test repository method-validation proxies.
- **File-backed credentials/policy:** use test resources or temporary test-owned files, with malformed/missing/duplicate entries and safe failure behavior. Never load production credentials or print them on assertion failure.
- **Actual JDBC/JPA repository:** choose the appropriate installed slice and an isolated embedded database or disposable instance of the production engine. Prove dialect/migration/constraint/transaction behavior on the real engine when those details matter. Driver dependencies alone are not a reason to add persistence tests.
- **Sessions/registries:** verify ownership, expiry, logout/revocation cleanup, concurrent registration, and refusal after close. Do not treat security state as a disposable cache.
- **Disposable caches:** call the proxied bean to prove hit/miss behavior and actual source call counts; test tenant-key separation, immutable hits, null/negative lookup contract, load failures, size/TTL via a controllable ticker, and item/list invalidation. Test a warm-cache unauthorized call. Verify transaction commit/rollback ordering only when transactions exist.

Use fresh state, unique namespaces, temporary directories, or disposable test databases. Cleanup must target **test-owned** resources only; never recommend unqualified `deleteAll()` against a profile that might resolve to production. Test-managed transactions do not automatically roll back work done by a separate server/async thread. `@ActiveProfiles("test")` selects configuration; it does not prove that configuration is isolated or that every bean is replaced.

`@TestConfiguration` must be explicitly imported when appropriate. `@Primary` adds a preferred bean; it does not prevent a production client from being constructed or starting background work. Prefer a supported bean override or an explicit test-safe conditional configuration when startup side effects must be excluded.

## Verification commands and honest reporting

Run the target repository's wrapper from its root with the required JDK and isolated fixtures. Choose the commands needed for the change; the following is a reference, not a mandatory sequence. Inspect dependency details for build/migration issues, run focused regression tests, then required integration/quality checks.

```powershell
.\mvnw.cmd -version
.\mvnw.cmd help:effective-pom
.\mvnw.cmd dependency:tree
.\mvnw.cmd "-Dtest=TransportPropertiesTest,DeviceIdPolicyTest" test
.\mvnw.cmd verify
```

Use `./mvnw` on POSIX. Select focused tests that actually exist. `test` compiles production and test sources and runs Surefire tests; `verify` reaches packaging and configured integration/quality checks. `package` is sufficient when verifying only packaging, while integration tests often require Failsafe's `verify` lifecycle. Inspect the POM rather than assuming every `*IT` is discovered or `verify` automatically enables a dormant integration-test profile.

For Gradle, use the existing task/module names:

```powershell
.\gradlew.bat --version
.\gradlew.bat test --tests "com.example.backend.TransportPropertiesTest"
.\gradlew.bat check
```

Use `./gradlew` on POSIX. `check` runs configured verification tasks, not necessarily every integration test or packaging task. Use `build` when packaging is required and confirm custom suites are wired into the chosen lifecycle. Read JUnit XML/HTML reports under the configured build directory for counts and skips.

- Confirm wrapper/JDK compatibility and resolved dependencies before treating a compiler failure as an application regression. Modern annotation processors must be configured for production **and** test sources when used.
- Record executed test counts, failures, errors, and skips from Surefire/Failsafe reports. Check excluded names/tags/profiles, `@Disabled`, `-DskipTests`, and nested test discovery. JUnit Jupiter nested test containers normally require `@Nested`; a nested class that merely contains `@Test` methods may not run.
- A successful `test-compile` proves compilation only. `-DskipTests package` is not a passing test run; `-Dmaven.test.skip=true` can skip test compilation too. Do not “fix” a failing test by silently disabling it.
- JaCoCo `report` generates a report. Coverage is enforced only if an actual `check` execution/rules or another gate runs; inspect its phase, includes/excludes, and the report's executed classes. Do not invent a threshold or equate coverage percentage with correctness.
- Network-restricted dependency resolution, unavailable JDKs/containers, port permissions, missing test secrets, and absent hardware are environmental blockers. State which command stopped and why; do not report the suite as passed or weaken production validation to bypass the environment.

A useful completion report separates **inspected**, **executed**, and **not verified**. Example: “Inspected build, schema, and security wiring. Ran the focused configuration/proxy tests: 5 executed, 0 failures, 0 skipped. Full verification blocked before tests by an unavailable toolchain. HTTP/WebSocket and hardware behavior not verified.” Replace those sample counts with actual report evidence; never copy them as a result.

## Skill maintenance evaluations

When changing this skill, use these scenarios as acceptance cases, not as claims that the target application already implements the behavior. Supply the stated build/code facts, then check the resulting plan, examples, and verification choices. Run important cases in fresh conversations so prior knowledge cannot hide a missing instruction.

| Scenario | Expected guidance | Fail the evaluation if |
|---|---|---|
| Add a new feature with a device command and observed result | Identify capability ownership; show feature-local production/schema/test paths; implement and verify an observation slice and command slice; list scanning/config/permission/transport wiring | It gives only abstract principles or a directory skeleton, builds horizontal layers first, or places every feature's classes in global layer packages |
| Extend an existing command coordinator | Show a lazy command supplier, feature operation type, named confirmation predicate, independent ingestion, future-returning controller, and bounded deterministic tests | It substitutes bare `@Async`, creates a private worker/retry registry, or treats requested/stale state as observed confirmation |
| Boot 4: add a protected device-status subscription | `@SubscriptionMapping`, explicit resource access, replay/demand contract, cleanup, Boot 4 test imports, execution and actual WebSocket checks | It injects an HTTP tester into an execution-only slice, trusts a supplied client ID, or chooses an unbounded queue without a policy |
| Boot 3.3: fix controller validation without a framework upgrade | Version-compatible imports and `@MockBean` where a context override is needed; test the actual validation path | It introduces Boot 4 imports or Framework 6.2-only `@MockitoBean`, or upgrades dependencies just to fit a template |
| ACK times out while the worker ignores interruption | Distinguish timeout from termination/unknown delivery, retain conflict ownership as needed, bound observation cleanup, test late completion | It automatically retries an unsafe command or declares the device free just because the result future timed out |
| Nested transport config has a zero duration and an absent section | Test nested defaults and actual binding/validation; reject zero via a supported duration constraint/predicate | It puts numeric `@Positive` on `Duration`, relies on Jackson annotations for binding, or tests only direct record construction |
| Build declares SQLite, but no datasource/repository implementation exists | State that storage use/durability is unproven; add persistence only if the requested feature needs it | It invents JPA entities, assumes a working SQLite database, or claims crash recovery from the driver dependency |
| Patch distinguishes omission, explicit null, and a value | Preserve presence through binding, validate allowed changes, construct a valid replacement or intentional update | It applies blanket null-ignore mapping, permits protected-field changes, or claims default MapStruct null mapping always throws |
| Cached mutable output and per-user access check | Choose immutable cached values or copy outside the cache; authorize every hit and miss; scope keys and invalidation | It copies only inside `@Cacheable`, puts result-based vetoes in `condition`, or lets a warm cache bypass authorization |
| Fix one REST status mapping in an established layer-based app | Read the REST/error path and callers, preserve packages and envelope, add a focused regression check | It loads every reference, reorganizes packages, or introduces command orchestration |
| Review a Java service without requesting edits | Trace callers and report concrete correctness findings with file/line evidence | It edits files or reports hypothetical risks as demonstrated defects |

For each evaluation, require a coherent end-to-end slice, correct resource selection, and a truthful statement of unexecuted checks. Do not reward extra layers or newer dependencies unless the supplied task requires them.

Also regression-test activation with the actual prompt hook:

| Prompt | Backend skill suggested? |
|---|---|
| `Add backend JWT authorization tests` | Yes |
| `Fix Java virtual-thread shutdown` | Yes |
| `Add a GraphQL subscription resolver` | Yes |
| `Fix validation in a Spring Boot 3.3 controller` | Yes |
| `Review a MapStruct patch mapping` | Yes |
| `Fix React form validation` | No |
| `Fix Apollo client GraphQL subscription caching` | No |
| `Fix frontend WebSocket reconnect authentication` | No |
| `Review this Git repository` | No |
| `Add a controller to an Express backend` | No |

Check JSON/regex syntax, stable skill identity, resource links/anchors, balanced fences, the entry point's 500-line limit, and description length. The prompt hook consumes `promptTriggers`; its presence does not prove `fileTriggers` are enforced. Keep maintenance evaluations here rather than duplicating them in every resource. Structural checks and manual scenario review do not substitute for fresh-session behavioral evaluations; report which were actually run.
