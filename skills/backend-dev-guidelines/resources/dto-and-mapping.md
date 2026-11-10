# DTO and Mapping Patterns

Choose representations by their contract and state semantics, not by transport stereotypes. REST does not require mutable beans, and a domain object does not automatically need `@Data`.

## Table of Contents

- [Decide where a representation boundary exists](#decide-where-a-representation-boundary-exists)
- [Records, mutable classes, and collection ownership](#records-mutable-classes-and-collection-ownership)
- [Input validation and serialization](#input-validation-and-serialization)
- [Choose manual mapping or MapStruct](#choose-manual-mapping-or-mapstruct)
- [Annotation processor setup](#annotation-processor-setup)
- [Strict MapStruct mappings](#strict-mapstruct-mappings)
- [Nested, collection, and enum mappings](#nested-collection-and-enum-mappings)
- [Nulls and defaults](#nulls-and-defaults)
- [Partial updates](#partial-updates)
- [Mapping verification](#mapping-verification)

## Decide where a representation boundary exists

A DTO is a contract, not a mandatory extra class for each application layer. Introduce a separate representation when it protects a meaningful difference:

| Boundary | Reasons for separation |
|---|---|
| Request → use case | Writable fields, validation, caller-independent command semantics |
| Domain → public output | Sensitive/internal fields, stable versioning, flattened or computed view |
| External protocol → domain | Wire names, units, foreign enums, malformed or missing data |
| Persistence → domain/output | Lazy proxies, persistence lifecycle, query-specific projection |

GraphQL and REST are parallel adapters, not a chain through which a model must pass. They can share a safe record when fields, nullability, validation, exposure, and evolution are intentionally identical. Split them when their contracts diverge. Do not copy every enum or DTO just to add a transport suffix.

Follow existing naming: `*Gql`, `*Dto`, `*Request`, `*Input`, `*Command`, and `*Snapshot` are useful when they convey an actual role. Locate types in the owning feature; subdivide `dto/` by transport/external system only when that makes navigation clearer.

Keep desired and observed values distinct. Mapping a command into an observed snapshot would falsely claim that a remote change succeeded. Mapping also must not grant permissions, generate a domain identity as a hidden side effect, or discard a protocol rejection. See [core-patterns.md](core-patterns.md).

## Records, mutable classes, and collection ownership

Prefer records for snapshots, value objects, input/output DTOs, and projections where value equality and fixed components fit. Records provide accessors, a canonical constructor, equality/hash code, and `toString`; no Lombok is needed.

Complete record example; each string is immutable:

```java
import java.util.List;
import java.util.Objects;

public record DeviceSnapshot(String id, List<String> interfaceNames) {
    public DeviceSnapshot {
        Objects.requireNonNull(id, "id");
        interfaceNames = List.copyOf(interfaceNames);
    }
}
```

Records are **shallowly immutable**. A final list reference does not freeze its list or its elements. `List.copyOf` takes an unmodifiable snapshot of the collection structure and rejects null collections/elements; it does not deep-copy elements. Choose that null policy intentionally. `Collections.unmodifiableList(source)` alone is a view and still reflects changes through `source`.

For `List<MutableChild>`, copy/convert the children into immutable values or document controlled ownership. Arrays need copying on input **and** access; record-generated equality for array components uses array reference equality, not content equality. A record's hash can also change when a mutable component changes, making it unsuitable as a hash key without stronger ownership.

Use a regular class when it owns transitions, must work with a verified framework constraint, or has lifecycle/identity semantics rather than value semantics. Keep mutation behind named domain methods. Selective getters/setters are preferable to an automatic `@Data` bundle. Ordinary JPA entities are classes, while records work well as their DTOs/projections. See [lombok-guide.md](lombok-guide.md).

Generated record `toString` includes components. Credentials and tokens need explicit redaction or a deliberate non-record type; records are not automatically safe to log.

## Input validation and serialization

Input record example; `DeviceMode` is an existing domain/API enum:

```java
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SetModeRequest(
        @NotBlank String deviceId,
        @NotNull DeviceMode mode,
        @Size(max = 200) String reason) {
}
```

`@NotBlank` applies to character sequences, not enums; use `@NotNull` for required enum/object values. Many constraints, including `@Size`, accept null, so combine them with a requiredness constraint when necessary. Use `@Valid` for nested object validation and container-element constraints for collection members.

Annotations do not validate arbitrary `new SetModeRequest(...)` calls. Verify the REST/GraphQL binding and validation path, including nested input, and keep non-negotiable business invariants in the domain/service boundary. Do not rely on controller-only validation for jobs or internal callers. See [validation-and-caching.md](validation-and-caching.md), [graphql-patterns.md](graphql-patterns.md), and [rest-api-patterns.md](rest-api-patterns.md).

**Boot 3 / Boot 4 compatibility:** supported Jackson versions can deserialize records through their canonical constructors; REST DTOs do not inherently need setters or a no-argument constructor. Boot 3 normally integrates Jackson 2; Boot 4 defaults to Jackson 3 integration, while applications may retain Jackson 2 dependencies or explicit mappers. Inspect the resolved dependencies and the serializer actually used by each boundary. Jackson 3 databind types use `tools.jackson.databind`, whereas Jackson 2 uses `com.fasterxml.jackson.databind`; do not mechanically change all annotation imports.

Use explicit wire-name annotations only when the contract differs from Java naming, and test with the project's configured mapper rather than a new unconfigured one. Verify absent/null values, unknown fields/enums, date/time formats, numeric ranges, and error responses. Serialization annotations do not configure Spring property binding; configuration records are covered in [configuration.md](configuration.md).

## Choose manual mapping or MapStruct

An explicit constructor mapping is appropriate for a few straightforward fields. It is not a code smell simply because MapStruct exists. Use established MapStruct infrastructure for repeated, nested, or evolving mappings where generated compile-time checks add value.

Keep mappers deterministic and side-effect-free. Construct identities and enforce transitions in named domain methods, not Java expression strings hidden in annotations. A complicated mapper often means the conversion is actually a domain operation.

Inspect the existing mapper policy and processor configuration before adding another one. Finding a mapper annotation or generated file does not prove a clean build will regenerate and compile it.

## Annotation processor setup

`org.mapstruct:mapstruct` supplies annotations; `mapstruct-processor` generates implementations. Use the [shared processor setup](configuration.md#dependency-and-processor-configuration) for version alignment, Lombok binding, and Maven configuration. For Gradle, use `annotationProcessor` and `testAnnotationProcessor` where needed. Verify a clean command-line build regenerates implementations and compiles consumers; IDE-generated classes can hide missing processor configuration.

## Strict MapStruct mappings

Fragment; `DeviceSnapshot` and `DeviceView` are feature types with the indicated source/target properties:

```java
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface DeviceMapper {
    @Mapping(source = "id", target = "deviceId")
    DeviceView toView(DeviceSnapshot snapshot);
}
```

Record components are valid mapping properties. Use `@Mapping` for renamed/nested properties; matching compatible names map automatically. If a target is intentionally not populated, use a specific `ignore = true` and explain the ownership when it is not evident. Prefer a shared existing `@MapperConfig` for policy consistency.

Strict targets catch forgotten destination properties, not all security problems: same-name sensitive fields can map automatically, and unused source properties are a separate policy. For restricted outputs, define an output type that contains only permitted fields. An explicit `@BeanMapping(ignoreByDefault = true)` allowlist can help a sensitive projection, but it also means newly added targets will not trigger the usual unmapped-target warning/error; review and test that tradeoff.

Use constructor injection for generated mappers that depend on other mappers, according to the existing `InjectionStrategy`/mapper config. Ensure component scanning includes generated Spring beans. Do not mix `Mappers.getMapper` instances with injected Spring mapper graphs that need collaborators.

## Nested, collection, and enum mappings

- Declare an element mapping for nested values and collections when the conversion is not already unambiguous. Generated list/set methods reuse it; output collection mutability still needs an explicit contract.
- Use `uses = ChildMapper.class` for coherent, one-way mapper dependencies. Break cycles by using a bounded projection or reference ID, not recursive full object graphs.
- Map enums explicitly when wire values differ. Compile-time enum coverage helps, but external strings and unknown values need deliberate validation/fallback behavior. Never silently map an unknown security/state enum to a permissive default.
- Use `@Named` from **`org.mapstruct.Named`**, not a dependency-injection annotation, with `qualifiedByName` to select a conversion. Prefer a typed qualifier when the project already uses one.
- Use `constant` for an intentional literal target value and `defaultValue` for a null source-property fallback; they are not domain initialization rules.

Named conversion fragment for a mapper whose source property is `Duration` and target property is a millisecond count:

```java
import java.time.Duration;
import org.mapstruct.Named;

@Named("toTimeoutMillis")
default long toTimeoutMillis(Duration timeout) {
    return timeout.toMillis();
}
```

Reference it with `qualifiedByName = "toTimeoutMillis"`. The boundary must reject null/invalid durations if the target requires a value; MapStruct null-check strategy and custom-method invocation must be verified in generated code. Do not rely on an expression string to supply those rules. Keep unit conversion separate from domain timeout policy.

## Nulls and defaults

By default, a generated single-source bean mapping returns **null for a null source**, not a `NullPointerException`. Iterable mappings normally return null for a null collection source too. Custom methods, expressions, multi-source mappings, builders, and configured strategies can change this behavior; inspect generated code and test the actual contract.

Distinguish these policies:

| Mechanism | Controls |
|---|---|
| `NullValueMappingStrategy` | Mapping result when the source argument is null |
| `NullValuePropertyMappingStrategy` | Null/absent source-property handling in update mappings |
| `NullValueCheckStrategy` | Generated checks around source-property reads/conversions |
| `defaultValue` | Fallback for a mapped null source property, with conversion if needed |

Returning an empty collection can be useful for a non-null API contract, but normalizing null to empty destroys a distinction if the domain uses null for unknown/unobserved data. Apply defaults at the layer that owns their meaning. A mapper returning null does not make an invalid null response compatible with a GraphQL non-null schema or a REST contract.

## Partial updates

Define the update protocol before choosing annotations. These are different operations:

1. Replace all writable fields; omitted values follow the replacement contract.
2. Patch selected fields; absent means leave unchanged, explicit null may mean clear.
3. Execute a domain transition; changing a property can require authorization, validation, or remote confirmation.

Plain nullable record components commonly collapse absent and explicit null during binding. `Optional` alone is not a universal tri-state JSON input solution. Use the existing presence-aware binding/patch representation; Spring GraphQL's `ArgumentValue<T>`, where supported, can preserve omitted versus explicit-null arguments. Verify nested behavior with real transport tests rather than assuming it.

For a contract where **null deliberately means no change**, an update mapping may use:

```java
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
@Mapping(target = "id", ignore = true)
void applyNonNullFields(UpdateLabelInput input, @MappingTarget MutableLabel target);
```

Fragment inside a mapper; feature types and other target-property mappings are omitted. `IGNORE` does not allow an explicit null to clear a field and does not create presence tracking. Collection update behavior also depends on accessors and collection strategy; verify replacement versus merge rather than assuming either.

An immutable record cannot be updated through setters; construct a validated replacement or call a domain factory. For invariant-bearing mutable objects, apply named domain methods instead of bulk setter mapping. Never let a patch overwrite identity, ownership, permissions, server timestamps, or confirmed state from untrusted input. Validate the resulting aggregate, not just each patch field independently.

## Mapping verification

Use the real configured serializer and generated mapper implementation for the relevant tests:

- Compile with strict target checks and inspect representative generated sources after processor/config changes.
- Verify null sources, null/empty collections, nested nulls, renamed fields, units, enum coverage, and unknown external values.
- Test that later mutation of input collections/elements cannot alter an allegedly immutable output.
- Exercise actual REST/GraphQL binding, validation, response field exposure, and omitted/null distinctions.
- Confirm updates cannot alter protected fields and preserve domain invariants.
- Test cycles and large graphs for bounded output rather than relying on recursive mapping.
- Keep focused one-way contract assertions; a round-trip alone can hide a symmetric mapping mistake.

See [testing.md](testing.md) for test organization and [complete-examples.md](complete-examples.md) for integrated examples. Source inspection and a declared processor version are not substitutes for compilation or contract tests in the target application.
