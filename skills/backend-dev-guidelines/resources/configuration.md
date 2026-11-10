# Configuration and Runtime Resources

Use this reference for property binding, dependency compatibility, and ownership of runtime resources. Examples require the indicated installed stack.

## Table of Contents

- [Inspect the compatibility and runtime baseline](#inspect-the-compatibility-and-runtime-baseline)
- [Validated configuration records](#validated-configuration-records)
- [Binding tests](#binding-tests)
- [Profiles, secrets, and safe diagnostics](#profiles-secrets-and-safe-diagnostics)
- [Dependency and processor configuration](#dependency-and-processor-configuration)
- [Executors, scheduling, and lifecycle](#executors-scheduling-and-lifecycle)
- [External clients and blocking boundaries](#external-clients-and-blocking-boundaries)
- [UDP transport boundaries](#udp-transport-boundaries)
- [Operational verification](#operational-verification)

## Inspect the compatibility and runtime baseline

Before suggesting properties, imports, starters, or replacement beans:

- Check the parent/BOM, toolchain, active profiles, actual mapper beans, and resource lifecycle owners.
- Distinguish MVC from WebFlux; Reactor alone does not establish a reactive server. Trace client/repository implementations rather than inferring them from dependencies.

Boot 3 and Boot 4 are not import-compatible everywhere. Jackson 2 application mappers (`com.fasterxml.jackson.databind`) may coexist with Jackson 3 dependencies. Jackson 3 core/databind use `tools.jackson.core` and `tools.jackson.databind`; shared annotations still use `com.fasterxml.jackson.annotation`. Do not mechanically rename imports or replace a mapper without testing modules, serializers, and every protocol using it.

## Validated configuration records

Use cohesive, constructor-bound records and the validation starter/provider matching the build. Registration is required: choose `@ConfigurationPropertiesScan` on the application or explicit `@EnableConfigurationProperties`, not both for the same type. Do not register a constructor-bound record as an ordinary `@Component`.

**Boot 3 / Boot 4 common API:** the following record has usable defaults even when its entire nested section is absent. Imports are explicit because Jackson binding is not involved.

```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties("app.transport")
@Validated
public record TransportProperties(
        @Valid @NotNull @DefaultValue Client client,
        @DefaultValue("64") @Positive int maxInFlight) {

    public record Client(
            @NotNull @DefaultValue("2s") Duration connectTimeout,
            @NotNull @DefaultValue("5s") Duration readTimeout) {

        @AssertTrue(message = "Transport timeouts must be positive")
        public boolean isTimeoutConfigurationValid() {
            return isAbsentOrPositive(connectTimeout) && isAbsentOrPositive(readTimeout);
        }

        private static boolean isAbsentOrPositive(Duration timeout) {
            return timeout == null || (!timeout.isZero() && !timeout.isNegative());
        }
    }
}
```

`@NotNull` handles missing values; the named duration predicate handles zero/negative values. Jakarta `@Positive` supports numbers, **not `Duration`**. For several reusable duration constraints, use a small custom validator or an already-installed provider's duration constraint, with tests; do not assume an unsupported annotation works.

```java
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(TransportProperties.class)
class TransportConfiguration {}
```

```yaml
app:
  transport:
    max-in-flight: 64
    client:
      connect-timeout: 2s
      read-timeout: 5s
```

- Empty `@DefaultValue` instantiates the nested record when no nested keys bind; `@Valid` cascades into it. Neither replaces the other. Use `@NotNull` for required nested sections without defaults.
- Boot relaxed binding maps `max-in-flight` to `maxInFlight`; Jackson `@JsonProperty` does not control configuration binding. Kebab-case is the canonical file spelling; do not falsely reject every underscore/camel-case spelling accepted by a source's relaxed binding rules. Environment-variable transformations differ; test deployment names.
- Prefer `Duration` with explicit units (`500ms`, `5s`) over unitless numbers. Preserve old `*-ms` contracts during migration or provide a deliberate compatibility plan. Use `DataSize` (`64KB`, `2MB`) for byte limits where useful, with an actual positive/range validator; numeric constraints do not automatically apply to it.
- Records are only shallowly immutable. Copy mutable collection components where ownership requires it, and constrain entries with container-element annotations.
- Separate required deployment values from safe local defaults. Missing credentials and unsafe production combinations should fail startup, not silently select a mock or permissive mode.

## Binding tests

Use `ApplicationContextRunner` to test binding and validation without starting a server. It does **not** load every `application.yml` automatically. Supply the intended properties or deliberately add config-data initialization for a file-loading test.

Choose exactly one validation import:

| Target | Import |
|---|---|
| Boot 3 | `org.springframework.boot.autoconfigure.validation.ValidationAutoConfiguration` |
| Boot 4 | `org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration` |

The remaining imports are common to both lines. This example uses the **Boot 4** import and the record/registration above; include the matching validation test/runtime dependencies.

```java
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import static org.assertj.core.api.Assertions.assertThat;

class TransportPropertiesTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(ValidationAutoConfiguration.class))
            .withUserConfiguration(TransportConfiguration.class);

    @Test
    void bindsAbsentNestedSectionWithDefaults() {
        runner.run(context -> {
            assertThat(context).hasNotFailed();
            var properties = context.getBean(TransportProperties.class);
            assertThat(properties.client().connectTimeout()).isEqualTo(Duration.ofSeconds(2));
            assertThat(properties.maxInFlight()).isEqualTo(64);
        });
    }

    @Test
    void bindsExplicitUnitOverride() {
        runner.withPropertyValues("app.transport.client.read-timeout=750ms")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBean(TransportProperties.class).client().readTimeout())
                            .isEqualTo(Duration.ofMillis(750));
                });
    }

    @Test
    void rejectsNonPositiveNestedTimeout() {
        runner.withPropertyValues("app.transport.client.read-timeout=0s")
                .run(context -> assertThat(context).hasFailed());
    }
}
```

Also test malformed units, negative values, nested required fields, collection elements, profile overrides, and any cross-field rules. Assert the relevant cause/message when more than one startup failure could satisfy `hasFailed()`. A direct `new TransportProperties(...)` test does not prove binding, registration, or validation.

## Profiles, secrets, and safe diagnostics

Keep shared safe defaults in `application.yml`, intentional environment differences in `application-{profile}.yml`, and secrets outside source control. Activate deployment profiles externally (`SPRING_PROFILES_ACTIVE=prod` or `--spring.profiles.active=prod`). Do not commit `spring.profiles.active=dev` as a production fallback.

```yaml
# application-prod.yml; illustrative external credentials, not a required HTTP architecture
app:
  upstream:
    base-url: ${UPSTREAM_BASE_URL}
    api-key: ${UPSTREAM_API_KEY}
```

- Use the deployment's secret store, mounted/config-tree secrets, or protected environment injection. Avoid command-line secrets, default credentials, real tokens in test fixtures, and secrets embedded in URLs.
- Prefer explicit conditional beans/profiles for a mock versus a real client. Avoid a `@ConditionalOnMissingBean` mock fallback that masks broken production wiring; test that exactly the intended implementation starts.
- Profile-specific datasource beans are relevant **only if persistence exists**. Prefer the installed Boot datasource auto-configuration to duplicating pools and credentials manually.
- Do not log a configuration record's `toString()`, dump the environment, log authorization headers, or dump request/datagram bodies indiscriminately. Record-generated `toString()` includes secrets.
- Log an allowlisted operational summary, e.g. timeout, queue capacity, enabled transport, and profile. Omit full URLs/query strings and sensitive identifiers unless explicitly sanitized. Logging nothing is safer than an unsafe diagnostic dump.
- If a redaction helper already exists, test nested sensitive records, collections/maps, null values, annotated parent sections, and exception paths. Redact a sensitive parent **before traversing its children**; do not assume leaf-only annotations cover new fields. Prefer allowlists over reflective discovery of every future field.
- Restrict diagnostic endpoints and review sanitization settings for the exact Boot version. Actuator presence neither makes dumps safe nor proves a metric is instrumented/exported.

## Dependency and processor configuration

Let the installed Boot parent/BOM manage compatible families. Add a direct version only when a dependency is not managed or a justified compatibility/security exception exists. Never copy a reference application's version pins as universal recommendations.

For each override, document the advisory/reason, managed baseline, affected artifact family, compatibility verification, and **removal criterion** (parent manages a patched compatible version). Re-evaluate on every parent upgrade: an old override can downgrade a newly patched BOM. Verify the effective dependency tree, not comments claiming a version is current.

Configure annotation processing explicitly, particularly on JDK 23+. Keep MapStruct API/processor and Lombok dependency/processor versions aligned with each other and the actual JDK. Include compatible `lombok-mapstruct-binding` when MapStruct consumes Lombok-generated members. Configure both production and test compilation when needed. The fragment below uses Maven Compiler Plugin 3.x-style processor paths; preserve the build's supported configuration model.

```xml
<!-- Fragment inside the existing maven-compiler-plugin configuration.
     Properties must resolve from this build/BOM; choose compatible versions there. -->
<annotationProcessorPaths>
    <path>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct-processor</artifactId>
        <version>${org.mapstruct.version}</version>
    </path>
    <path>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <version>${lombok.version}</version>
    </path>
    <path>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok-mapstruct-binding</artifactId>
        <version>${lombok-mapstruct-binding.version}</version>
    </path>
</annotationProcessorPaths>
```

Include Boot's configuration metadata processor if the project generates metadata; it is not the runtime binder or validator. Inspect plugin inheritance/execution-specific overrides before moving processor configuration. Prefer the build's established `release`/toolchain policy; do not change the declared Java version just to make the local machine compile.

## Executors, scheduling, and lifecycle

Every executor, scheduler, socket, subscription, and client pool needs **one owner**, a startup failure path, a rejection policy, and a shutdown contract. Inject shared resources; never shut them down from a borrower.

**JDK 21+, Boot 3 / Boot 4:** exposing the actual executor as a bean lets Spring manage that resource rather than an adapter hiding it.

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class WorkerConfiguration {
    @Bean(name = "ioExecutor", destroyMethod = "close")
    ExecutorService ioExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
```

This example shows **ownership, not bounded admission**. The executor creates a virtual thread per task and does not cap outstanding work. Use an existing semaphore/admission controller or bounded worker queue for finite downstream capacity, with overload behavior tested before accepting a request. Virtual threads do not make a device, database pool, memory budget, or rate limit unlimited.

Spring `@Bean` defaults to inferred destruction: a public `close` or `shutdown` method may be inferred; `AutoCloseable` resources also participate. On modern JDKs `ExecutorService.close()` waits for termination and can wait indefinitely for uncooperative tasks. Do not claim every bean requires explicit `destroyMethod`, that `shutdown()` waits, or that an adapter necessarily closes its wrapped executor. A bounded shutdown needs an owner that stops admission, cancels/unblocks work, calls shutdown, awaits for a configured bound, requests interruption if needed, and reports survivors. `shutdownNow()` requests interruption; it cannot force arbitrary code to stop. Suppress inferred destruction (`destroyMethod = ""`) only when another explicit owner is responsible.

- `@Async("ioExecutor")` requires `@EnableAsync` and an external call through the Spring proxy. Self-invocation bypasses advice. Verify executor selection and async exception handling; `void` failures need an uncaught-exception handler or another observable channel.
- `spring.threads.virtual.enabled=true` changes supported Boot auto-configured executors/schedulers. It does not convert arbitrary executors, common-pool futures, manually created threads, or every library callback into virtual threads. Inspect the chosen bean and actual worker threads.
- Use `@EnableScheduling` for annotation scheduling. A `fixedDelay` method that dispatches work asynchronously can return before that work ends, allowing overlap. Apply an explicit single-flight/conflict rule when overlap is unsafe; do not mistake scheduling cadence for operation completion.
- Use monotonic elapsed time for operation budgets and injected `Clock` for wall-clock expiry. Retain real task/transport cancellation handles: `CompletableFuture.cancel(true)` does not guarantee worker interruption. Follow the [deadline and cancellation contract](core-patterns.md#deadlines-cancellation-and-retries) for conflict ownership and late work.
- Stop accepting registrations before closing factories, timers, or channels. Cancel periodic tasks, clean failed partial starts, and make repeated shutdown safe. A map of dynamically created schedulers also needs bounds and a closed-registration rule.

## External clients and blocking boundaries

Configure HTTP only when it is an actual installed transport. Prefer injected, managed `RestClient.Builder` (Spring Framework 6.1+), `WebClient.Builder` (when the reactive client stack is installed), or the project's existing alternative. Preserve Boot customizers, TLS, observability, serialization modules, proxy settings, and pool ownership. Do not add WebFlux just to copy a sample.

**Spring Framework 6.1+; Boot 3.2+ / Boot 4, blocking client example:** the JDK request factory makes the timeout choices visible without assuming Reactor Netty.

```java
import java.net.URI;
import java.net.http.HttpClient;
import org.springframework.context.annotation.Bean;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

// Methods in the application's existing @Configuration class; JDK 21+.
@Bean(destroyMethod = "close")
HttpClient upstreamHttpClient(TransportProperties properties) {
    return HttpClient.newBuilder()
            .connectTimeout(properties.client().connectTimeout())
            .build();
}

@Bean
RestClient upstreamClient(RestClient.Builder builder,
                          TransportProperties properties,
                          HttpClient upstreamHttpClient, URI upstreamBaseUri) {
    var requests = new JdkClientHttpRequestFactory(upstreamHttpClient);
    requests.setReadTimeout(properties.client().readTimeout());
    return builder.baseUrl(upstreamBaseUri.toString()).requestFactory(requests).build();
}
```

`upstreamBaseUri` represents a separately validated bean from deployment configuration, not an automatically provided Boot bean. Qualify the client/URI injections if the application has several candidates. When replacing an auto-configured request factory, deliberately preserve required TLS/proxy/observation behavior. The JDK client's `close()` is owned by Spring here, but can wait for outstanding work; use the bounded lifecycle policy described above if shutdown must have a hard operational bound.

Connect timeout, pool-acquisition timeout, response/read timeout, and the operation's overall deadline are different limits. Verify semantics for the selected connector: a read timeout is not necessarily a full-response/body deadline. Bound response bodies and error bodies. Configure retry only for classified transient failures within the same overall budget; require idempotency or a deduplication key before retrying commands whose delivery is uncertain. An ACK, transport success, and confirmed observed state are different events.

Never call `.block()`, `Future.get()`, or another blocking client on Reactor event-loop threads. A servlet/virtual worker can block within a defined budget; a reactive pipeline should compose non-blocking operations. If an installed blocking API must enter a reactive path, isolate the boundary on the project's bounded blocking scheduler with explicit capacity/deadline behavior. Preserve existing `RestTemplate` code when appropriate; its builder APIs and deprecations vary by Boot version, so do not paste obsolete setters as a universal migration.

## UDP transport boundaries

Keep generic datagram transport separate from domain parsing. Transport owns channel lifecycle, bounded receive/dispatch, source metadata, timestamps, and overload behavior; the protocol handler owns framing, declared lengths, versions/opcodes, encoding, and domain validation. Do not embed one application's wire constants in reusable infrastructure.

- Copy the received bytes before reusing a buffer or handing work to another thread. Honor offset/length; never parse unused backing-array bytes. Read-only wrappers do not make shared mutable backing storage safe.
- Detect possible truncation. For a protocol limit of N bytes, a buffer of N+1 can detect oversize messages up to the API's truncation behavior; reject anything above N. A buffer filled exactly to capacity cannot generally distinguish a valid exact-size datagram from a truncated larger one. Define and test the policy rather than silently accepting it.
- Bound parser inputs, handler concurrency, and queue depth. Define drop/reject/coalesce policy and instrument it. Blocking the receive loop or using caller-runs on saturation may merely shift drops into the kernel; never claim lossless UDP.
- Malformed datagrams must not terminate the receiver or poison registry state. Validate sender/interface expectations without treating source address as authentication. Rate-limit payload/error logging and redact sensitive content.
- On multi-channel startup failure, close channels already opened, cancel started loops, and roll back registrations. If executor submission fails after setting `running`, restore state. Make the owner responsible for unblock/close and a bounded join on stop.
- Distinguish explicit restart from automatic recovery. Test loopback receipt, malformed/truncated packets, handler failure, saturation/drop policy, stop while idle/in flight, partial-start failure, and the chosen restart policy. Never promise automatic recovery just because a loop catches an exception.

## Operational verification

Expose only implemented observations: admitted/rejected work, in-flight operations, queue depth, deadline/late-worker counts, retries by outcome, dropped datagrams, active sessions/subscriptions, and shutdown survivors. Use bounded-cardinality labels; device/client IDs are usually logs/traces rather than metric tags. Adding Actuator does not create these custom measurements or prove a registry/exporter is connected.

Use the repository wrapper to inspect effective dependencies and compile both production and tests; run binding/lifecycle tests before the broader suite. See [testing.md](testing.md) for versioned test imports, safe commands, and truthful verification reporting. An inspection-only reference is not the test target unless executing it is also within the authorized scope.
