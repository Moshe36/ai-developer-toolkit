# Validation, State, and Caching

Validate at trust boundaries, enforce domain invariants at the owning layer, and classify state before choosing an eviction policy. A repository, session registry, observation stream, and disposable cache are not interchangeable.

## Table of Contents

- [Inspect before choosing annotations or a cache](#inspect-before-choosing-annotations-or-a-cache)
- [Constraint types and nullability](#constraint-types-and-nullability)
- [Boundary and method validation](#boundary-and-method-validation)
- [Cross-field rules](#cross-field-rules)
- [Validation is not authorization](#validation-is-not-authorization)
- [Classify state before eviction](#classify-state-before-eviction)
- [Optional bounded Caffeine configuration](#optional-bounded-caffeine-configuration)
- [Cache keys, proxies, and result rules](#cache-keys-proxies-and-result-rules)
- [Immutable values and ownership](#immutable-values-and-ownership)
- [Invalidation and consistency](#invalidation-and-consistency)
- [Verification checklist](#verification-checklist)

## Inspect before choosing annotations or a cache

Read the build, installed validation provider, Spring/Boot versions, controller style, repository implementation, and runtime state owners. Trace all callers of a changed boundary, including scheduled/internal callers and subscription handlers. Inspect current cache managers and dependencies; do not add Caffeine just because a Java service has maps.

Use `jakarta.validation` for Boot 3/4, but check exact integration behavior in the target Spring MVC/GraphQL versions. JDBC/SQLite dependencies alone do not establish durable storage. An observation/session store is not automatically a TTL cache or part of a database transaction.

## Constraint types and nullability

| Value | Appropriate constraint | Important limit |
|---|---|---|
| Required text | `@NotBlank`, optionally `@Size` | Already rejects null; adding `@NotNull` is redundant |
| Required enum/object | `@NotNull` | `@NotBlank` is for character sequences, not enums |
| Number/range | `@Min`, `@Max`, `@Positive`, `@PositiveOrZero` | Nullable wrappers still need `@NotNull` if required |
| Optional email/code | `@Email`, `@Pattern` | Null is generally valid; required text needs `@NotBlank` too |
| Collection | `@NotEmpty` or `@NotNull` plus `@Size` | Container size does not constrain its elements |
| Nested DTO | `@Valid`, plus `@NotNull` if required | Cascade ignores null; `@Valid` is not a constraint itself |
| Temporal value | `@Past`, `@Future`, or inclusive variants | Align clock and inclusive/exclusive contract |
| Duration/byte size | Named validation method or suitable custom/provider constraint | `@Positive Duration`/`DataSize` is unsupported |

Boot 3 / Boot 4 DTO example; each public type normally lives in its existing matching source file:

```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateDeviceInput(
        @NotBlank @Size(max = 100) String name,
        @NotNull DeviceKind kind,
        @NotNull @Min(1) @Max(100) Integer channelLimit,
        @Email String contactEmail,
        @NotEmpty @Size(max = 32) List<@NotNull @Valid ChannelInput> channels) {}

public record ChannelInput(@NotBlank @Size(max = 50) String name) {}
public enum DeviceKind { SENSOR, GATEWAY }
```

The example's email is optional; blank handling belongs to the explicit API contract. Optional fields need separate tests for missing, explicit null, empty, whitespace, and valid values. A primitive cannot distinguish an omitted value from its default after binding; use a wrapper or the framework's presence-aware input representation for patch semantics. Never normalize missing/null into the same value unless the contract says so.

Match GraphQL schema nullability, list-element nullability, enum values, custom scalars, and Java types. GraphQL coercion may reject an input before Bean Validation; neither layer substitutes for the other. Test the actual error shape and classification, without echoing credentials or full rejected payloads.

Use validation groups only when a shared DTO genuinely has different contracts and the framework selects those groups. Separate create/update inputs are often clearer. Default-group constraints do not automatically run just because a custom group is selected; use deliberate group composition/sequences and test them. Default messages are acceptable; customize messages when they explain a domain rule or stable public error contract, not merely for style.

## Boundary and method validation

- REST body validation uses `@Valid @RequestBody`; GraphQL annotated arguments can use `@Valid @Argument` with a configured Bean Validation provider. Confirm the integration and error resolver in the installed version, rather than claiming annotations alone always activate validation.
- Service method validation normally uses a Spring bean annotated `@Validated` and a configured method-validation postprocessor (usually supplied by Boot when validation is installed). External calls must pass through the proxy. Direct construction, self-invocation, and non-interceptable methods do not prove validation works.
- Spring MVC 6.1+ has native controller method validation. For that path, remove class-level `@Validated` on controllers rather than accidentally selecting the older AOP path. Argument validation and method validation can raise different exceptions (`MethodArgumentNotValidException` versus `HandlerMethodValidationException`); test the target version's mapping. This caveat does not remove `@Validated` from proxied service validation.
- Constraints on interface methods and overrides must obey Bean Validation inheritance rules; do not strengthen overridden parameter preconditions by adding incompatible constraints to implementations.
- Return-value constraints can protect a real invariant, but do not assert `@Min(1)` on counts where zero is valid.
- Keep validation synchronous and local where practical. Uniqueness, authorization, repository existence, and device state transitions usually belong to the service/domain transaction or concurrency boundary, not a validator that performs hidden I/O.

Example service boundary (Boot 3 / Boot 4, validation infrastructure required):

```java
import jakarta.validation.constraints.NotBlank;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
public class DeviceIdPolicy {
    public String requireDeviceId(@NotBlank String deviceId) {
        return deviceId;
    }
}
```

A plain unit test of `new DeviceIdPolicy()` tests Java behavior, not this annotation. Obtain the bean from a validation-enabled context and assert that invalid input fails through the proxy; see [testing.md](testing.md).

## Cross-field rules

Prefer existing field constraints and named domain predicates. Introduce a class-level custom constraint only for a real relationship that a single-field annotation cannot express. Define inclusive/exclusive behavior explicitly; do not describe “strictly after” while permitting equality.

Example of an inclusive numeric range. The annotation and validator are separate public types; imports are shown to make the contract unambiguous.

```java
import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Constraint(validatedBy = PollingRangeValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPollingRange {
    String message() default "Minimum must not exceed maximum";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

```java
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@ValidPollingRange
public record PollingRangeInput(
        @NotNull @Positive Integer minimumSeconds,
        @NotNull @Positive Integer maximumSeconds) {

    public boolean hasBothBounds() {
        return minimumSeconds != null && maximumSeconds != null;
    }

    public boolean hasOrderedBounds() {
        return minimumSeconds <= maximumSeconds;
    }
}
```

```java
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PollingRangeValidator
        implements ConstraintValidator<ValidPollingRange, PollingRangeInput> {
    @Override
    public boolean isValid(PollingRangeInput value, ConstraintValidatorContext context) {
        return value == null || !value.hasBothBounds() || value.hasOrderedBounds();
    }
}
```

The validator leaves null handling to `@NotNull` on the object/fields, and accepts equal bounds. Test null, each missing bound, equal, ordered, reversed, and invalid individual bounds. Keep validators stateless/thread-safe; add property-path violations when clients need a field-specific error. For a reusable property annotation, include the required `FIELD`, `PARAMETER`, `TYPE_USE`, or record-related targets deliberately rather than copying an incompatible target set.

## Validation is not authorization

A valid UUID/client ID does not prove identity, ownership, role, or permission. Check authenticated principal-to-client/session ownership and tenant/resource authorization on every entry path, including subscriptions, keepalive, logout, cancellation, and cache hits. Never accept a caller-supplied tenant/client ID as proof of scope.

Authorize before accessing a cached value. If authorization is inside a `@Cacheable` method body, a hit bypasses it. Keep a non-cached authorization facade calling a separate cached query bean, or use a correctly ordered security interceptor verified by hit/miss tests. Avoid self-invocation as a purported proxy boundary.

## Classify state before eviction

| State | Example responsibility | Retention/invalidation decision |
|---|---|---|
| Authoritative in-memory | Current configuration, operation/conflict registry | Explicit lifecycle; arbitrary eviction can lose correctness |
| Observed state | Latest device snapshot, discovery observations | Freshness/version/source semantics; stale is not necessarily absent |
| Session state | Authenticated ownership, expiry, subscriptions | Security expiry, logout/revocation and coordinated cleanup |
| Durable state | Actual database/file-backed records | Persistence/transaction semantics proven by implementation |
| Disposable derived cache | Recomputable expensive lookup/projection | Bounded memory and tolerated staleness; removal must be safe |

Choose a cache only after specifying source of truth, miss behavior, freshness tolerance, key cardinality, ownership, concurrency, and invalidation events. Session expiry may trigger stream/transport cleanup; replacing it with a generic TTL cache can silently discard that behavior. If no disposable expensive lookup exists, no cache is necessary.

## Optional bounded Caffeine configuration

Use this only when Caffeine and Spring cache support are installed and appropriate. Confirm Boot 4's modular cache dependencies rather than assuming a starter from another release exists. `@EnableCaching` installs interception; defining a manager alone does not make annotations run.

```java
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableCaching
class LookupCacheConfiguration {
    @Bean
    CaffeineCacheManager cacheManager() {
        var manager = new CaffeineCacheManager("deviceViews", "deviceLists");
        manager.setAllowNullValues(false);
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(1_000)
                .expireAfterWrite(Duration.ofSeconds(30))
                .recordStats());
        return manager;
    }
}
```

Size and TTL here are illustrative, not production capacity advice. Promote them to validated properties if operational tuning requires it. Bound by weight rather than entry count if values vary greatly in size. `recordStats()` enables provider statistics; it does not prove metrics are exported. Cache warming is optional: bound its workload and call a proxied query bean rather than self-invoking annotations or creating an uncontrolled startup stampede.

## Cache keys, proxies, and result rules

- `@Cacheable` can skip method execution on a hit. It must not hide required writes, audit/notification effects, or per-request security checks.
- `@CachePut` always invokes the method and stores its result. It is not a transaction-aware write-through store by itself.
- `@CacheEvict` normally runs after successful invocation; `beforeInvocation=true` changes failure behavior, not commit semantics. `@Caching` combines related operations.
- Cache advice normally uses Spring proxies: self-invocation bypasses caching and eviction. Test through the real bean. Use a separate existing query/service boundary rather than a self-injected proxy workaround.
- `condition` is evaluated before invocation and cannot use `#result`. `unless` can veto storage after the result exists. With `Optional`, Spring normally unwraps the contained value; `#result` refers to that value, not the `Optional` wrapper.
- Define negative-cache behavior explicitly. With null values disabled, exclude null results or return/throw according to a documented not-found contract. Do not accidentally cache absence forever, or promise that a nullable method is never cached without checking the provider/settings.
- `sync=true` has provider and annotation restrictions (including no `unless`) and is not distributed single-flight. Concurrent misses, refresh, load failure, and cancellation still need tests appropriate to the provider/version.

Example annotation on an existing public proxied query method:

```java
@Cacheable(cacheNames = "deviceViews", unless = "#result == null")
public DeviceView findView(String tenantId, String deviceId) {
    return source.findView(tenantId, deviceId);
}
```

`source` is the application's actual lookup collaborator, and `DeviceView` is the immutable snapshot below. This fragment intentionally uses Spring's default multi-argument `SimpleKey`; it preserves argument boundaries instead of concatenating ambiguous strings. Scope the cache region to this method's key contract, or use a dedicated record key/key generator when methods would collide. Include tenant, authorization-relevant scope, locale/filter/version when they change the result. Authentication/authorization must execute **outside** this cached method on every request.

If a SpEL key uses parameter names, verify compiler parameter metadata; `#p0`/`#p1` are positional alternatives. Do not put an individual lookup and a list lookup into the same region under colliding keys such as a literal `"all"` that could also be an ID.

## Immutable values and ownership

```java
import java.util.List;

public record DeviceView(String id, String name, List<String> tags) {
    public DeviceView {
        tags = List.copyOf(tags);
    }
}
```

This snapshot is immutable because the elements are immutable strings. `List.copyOf` copies the container, not arbitrary mutable nested objects, and rejects null elements. A record containing a mutable model/list is not deeply immutable merely because it is a record.

Copying a mutable value **inside a `@Cacheable` method does not protect cache hits**: that returned object becomes the shared cached object and the method body does not run on hits. Prefer immutable cache values. If an existing API requires mutable results, put a copying facade **outside** the cached bean so every hit and miss passes through the ownership conversion; copy all mutable parts deliberately and test them. Do not promise safe “deep copies” from a builder, serialization roundtrip, or one shallow list copy.

## Invalidation and consistency

Map every write/event to affected entries: individual projections, parent/child views, lists, filtered searches, aggregates, negative entries, and any authorization-derived views. Updating one item does not invalidate cached lists automatically.

- Use targeted eviction when the key is known, or bounded-region eviction when affected list keys cannot be enumerated. Broad `allEntries=true` is simple but can cause load spikes and evicts other tenants in a shared region; choose deliberately.
- For an actual transactional store, synchronize mutation/eviction with **successful commit** using the project's transaction-aware cache integration or after-commit event handling. Test rollback and the commit/eviction failure window. `@Transactional` plus `@CachePut` does not by itself establish the required advice order or atomicity.
- After-commit eviction avoids publishing rolled-back state, but it does not eliminate every race: an older concurrent read can repopulate stale data after eviction. Use versioned keys/values, source-version checks, serialized updates, or another explicit strategy when that consistency matters.
- A local Caffeine cache is process-local. Multiple nodes do not invalidate each other automatically. A distributed provider likewise does not make database/cache updates atomic or authorization revocation immediate. Define cross-node invalidation, failure behavior, and acceptable staleness before adopting it.
- Observed state should reflect ACK/confirmation semantics rather than optimistic cache mutation unless the product explicitly distinguishes desired and observed values. Timeout does not prove nondelivery; late responses must not overwrite newer state without a correlation/version rule.
- Manual cache-aside code is appropriate only when annotations cannot express the lifecycle. Preserve null handling, load failures, races, and security; do not duplicate both manual lookup and annotations for the same operation.

## Verification checklist

- Test valid/invalid/null inputs and nested null elements through the real API boundary; test Bean Validation itself separately when useful.
- Test class-level relationships and any group selection; assert the intended violation path/type, not only an arbitrary failure.
- Test actual proxy validation/caching, cache hit and miss, tenant separation, immutable-value ownership, null/negative lookup behavior, and load failures.
- Test updates/deletes plus list/search invalidation; include transaction rollback/commit effects only when real transactions exist.
- Test unauthorized calls with a warm cache, revocation/session expiry, and multi-node behavior if deployed that way.
- Use a controllable ticker/clock where supported to test expiry without sleeps. Observe bounded capacity and actual provider statistics/exports rather than assuming Actuator proves them.

See [configuration.md](configuration.md) for validated properties, lifecycle and secrets; see [testing.md](testing.md) for the version-aware execution and integration test boundaries.
