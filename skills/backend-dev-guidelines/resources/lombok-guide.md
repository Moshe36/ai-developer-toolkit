# Lombok Guide

Use Lombok to remove mechanical code without hiding ownership, identity, validation, or lifecycle decisions. Keep existing project conventions, but do not copy annotation bundles merely because they appear nearby.

## Table of Contents

- [Choose the type before its annotations](#choose-the-type-before-its-annotations)
- [Constructor injection](#constructor-injection)
- [Getters, setters, Data, and Value](#getters-setters-data-and-value)
- [Secret-safe string representations](#secret-safe-string-representations)
- [Equality and hash codes](#equality-and-hash-codes)
- [Builders and defaults](#builders-and-defaults)
- [JPA-specific cautions](#jpa-specific-cautions)
- [Build integration and verification](#build-integration-and-verification)

## Choose the type before its annotations

| Need | Starting point |
|---|---|
| Snapshot, value object, request/response DTO, projection | Record, including for REST |
| Controlled mutable state or domain lifecycle | Class with named operations and selective accessors |
| Spring service/controller/repository | Constructor injection; no data/equality bundle |
| Framework-constrained bean/entity | Class satisfying the verified framework contract |

Records already generate a constructor, accessors, equality/hash code, and `toString`; they do not need Lombok. They are shallowly immutable, so collection/array ownership still needs attention. Their generated `toString` can expose secrets just as a generated class method can. See [dto-and-mapping.md](dto-and-mapping.md).

`@Value` remains useful in an existing immutable class/bean-style API that cannot be changed compatibly to record accessors or semantics. It is not deep immutability and is not automatically wrong. Avoid migrating public types solely to reduce annotation count.

## Constructor injection

`@RequiredArgsConstructor` generates parameters for **uninitialized final fields** and uninitialized fields annotated with Lombok `@NonNull`. Already initialized final fields are owned state, not constructor dependencies.

One constructor is sufficient for Spring injection without `@Autowired`. Final references do not make a service or its dependencies thread-safe. Lombok does not own or close resources initialized in fields; lifecycle management is still explicit.

Use a manual constructor when it makes wiring clearer, especially for qualifiers:

```java
import java.util.concurrent.Executor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class DeviceWorkService {
    private final Executor executor;

    public DeviceWorkService(@Qualifier("deviceExecutor") Executor executor) {
        this.executor = executor;
    }
}
```

The example assumes an existing bean named `deviceExecutor`. Do not assume field-level `@Qualifier`, `@Value`, or other framework annotations are copied to Lombok-generated parameters; inspect generation and repository `lombok.config` if relying on copyable annotations. A short manual constructor is often safer than adding global Lombok configuration for one injection point.

`@AllArgsConstructor` includes non-static fields beyond required collaborators, including mutable runtime/configuration state where applicable. It is not the default solution for a service with non-final fields. Adding a flag, scalar configuration value, or registry can unexpectedly change Spring's constructor contract.

Use `@NoArgsConstructor` only when an actual framework/API needs it. `force = true` initializes final fields to JVM defaults and can bypass required invariants; do not use it to silence construction errors. Typed configuration binding belongs in [configuration.md](configuration.md), not an all-args service constructor.

## Getters, setters, Data, and Value

Prefer narrow annotations matching the public API:

- `@Getter` can expose a read-only reference, but it does not copy a collection or prevent mutation through that reference.
- `@Setter` on a mutable field makes an unconstrained write path. Do not generate it for identity, ownership, permissions, confirmed state, or fields whose changes must satisfy domain rules.
- `@Data` bundles getters, setters for non-final fields, `toString`, equality/hash code, and required-constructor behavior. It is not simply a shorter `@Getter`.
- `@Value` normally produces a final class with private final fields, getters, an all-args constructor, equality/hash code, and `toString`. Mutable components remain mutable.
- Lombok `@NonNull` supplies generated null checks where supported, not Bean Validation, authorization, non-blank checks, or domain validation.

`@Data` can fit a deliberately simple mutable carrier after reviewing every generated method, but is not a default for DTOs, mutable aggregates, session objects, credentials, or JPA entities. Explicit setters and `@Data` can undermine a carefully named transition method by allowing callers to bypass it.

For defensive-copy getters or invariant-checking constructors, handwritten code is appropriate. Lombok generally skips generation when a matching member already exists, so review method/constructor interactions instead of assuming annotations add everything independently.

## Secret-safe string representations

Prefer an allowlist over an exclusion list for objects that may acquire sensitive fields later:

```java
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.ToString;

@Getter
@RequiredArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
public final class CredentialMetadata {
    @ToString.Include
    private final String credentialId;

    private final String token;
}
```

The identifier must itself be safe to log under the application's policy. `@ToString.Exclude` is useful when an existing broad representation must omit a known field, but newly added secrets are safer under an inclusion policy. Neither annotation prevents explicit `getToken()` logging, JSON serialization, exception-message leakage, heap retention, or debugger exposure.

Avoid including relationships, streams, large collections, payload bytes, or fields whose getters can trigger I/O. Generated `toString` may call getters; inspect the configuration/generated code, or use `doNotUseGetters = true` where appropriate. That option is not a general solution for entity proxies or sensitive output.

Do not log an entire configuration object, request, or record merely because its generated representation is convenient. Use safe structured fields. Secret-bearing records need an explicit redacted `toString` or a different representation policy.

## Equality and hash codes

Decide whether a type has **value equality**, **stable identity**, or ordinary object identity before generating methods.

- Record/value equality suits immutable values when every component is intentionally part of equality.
- A mutable field in `equals`/`hashCode` can change set/map membership after insertion. A thread-safe collection does not fix that.
- `@EqualsAndHashCode(onlyExplicitlyIncluded = true)` can express a stable identity field, but only when that field is non-null, unique in the relevant scope, and stable throughout collection membership.
- Two new entities with null generated IDs must not accidentally compare equal just because only ID is included.
- Associations in equality can recurse, traverse huge graphs, or initialize lazy state. Avoid them unless explicitly part of a bounded value model.
- For inheritance, make superclass participation (`callSuper`) deliberate and preserve symmetry across subclasses/proxies. Do not silence Lombok warnings without understanding the hierarchy.

Do not generate equality for Spring services or operation/lock ownership tokens just to make tests easier. Where cleanup must identify the exact execution instance, value equality can remove the wrong run. Reference identity or an explicit unique token is often the correct contract.

For unusual equality—especially JPA identity and proxies—write and test the implementation rather than forcing it into an annotation. See the [JPA cautions](#jpa-specific-cautions) below.

## Builders and defaults

A builder improves readability for a real set of optional parameters; it does not ensure a valid object. A small record's canonical constructor is often clearer. Use a validating constructor/factory as the single construction boundary when invariants matter.

Complete example showing a builder on a validating constructor:

```java
import java.time.Duration;
import java.util.Objects;
import lombok.Builder;
import lombok.Getter;

@Getter
public final class RetrySettings {
    private final int maxAttempts;
    private final Duration delay;

    @Builder
    public RetrySettings(int maxAttempts, Duration delay) {
        if (hasNoAttempts(maxAttempts)) {
            throw new IllegalArgumentException("At least one attempt is required");
        }
        Objects.requireNonNull(delay, "delay");
        if (delay.isNegative()) {
            throw new IllegalArgumentException("Delay must not be negative");
        }
        this.maxAttempts = maxAttempts;
        this.delay = delay;
    }

    private static boolean hasNoAttempts(int maxAttempts) {
        return maxAttempts < 1;
    }
}
```

The example permits zero delay; actual retry safety and deadlines remain a use-case policy, not a builder feature. See [core-patterns.md](core-patterns.md).

### Defaults and collections

- With a class-level builder, an ordinary field initializer is generally not the builder default; use `@Builder.Default` when that behavior is intended.
- A builder default applies when the builder field is **unset**, not when a caller explicitly supplies null. Validate null separately.
- `@Singular` generates collection accumulation methods and an unmodifiable built collection for supported collection types. It does not deep-copy mutable elements or make the whole object immutable.
- Do not combine `@Singular` and `@Builder.Default` on the same field. Choose accumulation semantics or an explicitly handled default.
- `toBuilder = true` creates a builder seeded from the existing object; it is not a general deep-copy operation. Define collection/element ownership explicitly.
- A getter generated over a normal builder-supplied list exposes that same list unless construction/getter code copies it.

### Constructor interactions

Class-level `@Builder` normally relies on an all-args construction path and interacts with explicit or generated constructors. Combining it with `@NoArgsConstructor`, `@AllArgsConstructor`, or `@Value` changes generation/accessibility; do not stack all four to resolve errors without reviewing the resulting API.

Prefer placing `@Builder` on the intended constructor or factory when custom construction exists. Add no-argument/all-argument constructors only for a documented need. Framework-required construction should not become an alternative invalid public construction path.

Use `@Jacksonized` only if builder-based Jackson deserialization is actually required and supported by the resolved Lombok/Jackson versions. It is unnecessary for ordinary record deserialization. Boot 4/Jackson 3 support must be verified against the actual Lombok release, not assumed from Boot 3 examples.

## JPA-specific cautions

This section applies only to actual JPA entities; a SQL dependency does not establish JPA use.

Ordinary JPA entity design needs an accessible public/protected no-argument constructor and provider-compatible class/accessor behavior. A targeted `@NoArgsConstructor(access = AccessLevel.PROTECTED)` can supply that requirement, provided other construction paths preserve invariants. Records are suitable for DTOs/projections, not ordinary entities.

Avoid `@Data` on entities. Merely excluding relationships from `toString` and equality does not resolve:

- Generated-ID equality before and after persistence.
- Proxy/type equality and lazy initialization.
- Setter access to identity and controlled state.
- Mutable hash codes while an entity belongs to a set or map.
- Association ownership and bidirectional relationship maintenance.

Prefer explicit identity/equality behavior and targeted accessors. Avoid final entity classes/methods when the provider relies on subclass proxies; verify the provider's actual constraints rather than claiming one annotation set works everywhere. Test equality across new, persisted, detached, and proxied states, including collection membership and loading behavior.

Do not add an entity-wide builder that allows arbitrary IDs, version fields, or relationships merely for test fixture convenience. Build valid domain state through the same controlled construction paths used by production code.

## Build integration and verification

Use the [shared processor setup](configuration.md#dependency-and-processor-configuration). Inspect repository `lombok.config` and generated/delomboked code when constructor signatures, annotation copying, or method generation are unclear.

A clean command-line compile catches stale generated-source/IDE assumptions. Focused tests should cover the semantics generation cannot prove: builder validation/defaults, null handling, defensive copying, equality stability, secret-safe output, qualifier wiring, and any JPA lifecycle behavior actually in use. See [testing.md](testing.md).

**Boot 3 / Boot 4 compatibility:** most core Lombok annotations are independent of Spring Boot, but constructor wiring, serializer adapters, entity providers, processor versions, and JDK support depend on the resolved stack. Do not infer compatibility from an annotation compiling in an older project.

`@Slf4j` only generates a logger field. Keep the project's logging facade and follow the [logging policy](exception-handling.md#logging-and-diagnostics); generated logging does not sanitize values or change when arguments are evaluated.
