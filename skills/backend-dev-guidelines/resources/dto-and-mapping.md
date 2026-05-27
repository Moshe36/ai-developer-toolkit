# DTO and Mapping Patterns

Comprehensive guide to Data Transfer Objects (DTOs) and MapStruct mapping in Spring Boot applications.

---

## Table of Contents

1. [DTO Pattern Overview](#dto-pattern-overview)
2. [DTO Types and Conventions](#dto-types-and-conventions)
3. [Records vs @Data](#records-vs-data)
4. [MapStruct Basics](#mapstruct-basics)
5. [Advanced Mapping Patterns](#advanced-mapping-patterns)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)

---

## DTO Pattern Overview

### Why Use DTOs?

DTOs separate internal domain models from external representations:

1. **Decoupling**: API contracts independent of internal structure
2. **Versioning**: Multiple DTOs can map to same domain model
3. **Validation**: Different validation rules for different contexts
4. **Security**: Control what data is exposed
5. **Flexibility**: Different representations for different clients

### DTO Layers

```
┌─────────────────┐
│   GraphQL API   │ → LinkGql (record)
└─────────────────┘
        ↓
┌─────────────────┐
│  REST JSON API  │ → LinkDto (@Data)
└─────────────────┘
        ↓
┌─────────────────┐
│  Domain Model   │ → Link (@Data + @Builder)
└─────────────────┘
        ↓
┌─────────────────┐
│  External API   │ → ExternalLinkDto (record/class)
└─────────────────┘
```

---

## DTO Types and Conventions

### GraphQL DTOs (`*Gql`)

Use records for immutable GraphQL DTOs:

```java
package com.company.project.dto.gql;

public record LinkGql(
    String id,
    String name,
    LinkStatusGql status,
    String description
) {}

public enum LinkStatusGql {
    ACTIVE,
    INACTIVE,
    PENDING
}
```

### REST DTOs (`*Dto`)

Use `@Data` for mutable REST DTOs:

```java
package com.company.project.dto.json;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class LinkDto {
    private String id;
    private String name;

    @JsonProperty("link_status")
    private String status;

    private String description;
}
```

### Domain Models

Use `@Data` and `@Builder` for domain models:

```java
package com.company.project.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Link {
    private String id;
    private String name;
    private LinkStatus status;
    private String description;
    private String radioId;
}

public enum LinkStatus {
    ACTIVE,
    INACTIVE,
    PENDING
}
```

### Input Types

Use records for immutable input types:

```java
package com.company.project.dto.gql;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateLinkInput(
    @NotBlank(message = "Radio ID is required")
    String radioId,

    @NotBlank(message = "Name is required")
    @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    String name,

    String description
) {}

public record UpdateLinkInput(
    @NotBlank(message = "Link ID is required")
    String linkId,

    @NotBlank(message = "Radio ID is required")
    String radioId,

    String name,
    LinkStatusGql status,
    String description
) {}
```

### External System DTOs

Use records or classes for external API DTOs:

```java
package com.company.project.dto.external;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ExternalLinkDto(
    @JsonProperty("link_id")
    String linkId,

    @JsonProperty("link_name")
    String linkName,

    @JsonProperty("link_status")
    String linkStatus
) {}
```

---

## Records vs @Data

### When to Use Records

Use records for **immutable** DTOs:

```java
// GraphQL output types
public record LinkGql(String id, String name, LinkStatusGql status) {}

// Input types
public record CreateLinkInput(
    @NotBlank String radioId,
    @NotBlank String name
) {}

// Configuration classes
@ConfigurationProperties(prefix = "app")
public record AppConfig(
    String apiUrl,
    int timeout
) {}

// External API DTOs
public record ExternalLinkDto(String id, String name) {}
```

**Advantages of Records:**
- Immutable by default
- Concise syntax
- Built-in equals, hashCode, toString
- Perfect for value objects

### When to Use @Data

Use `@Data` for **mutable** objects:

```java
// Domain models that change over time
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Link {
    private String id;
    private String name;
    private LinkStatus status;

    // Methods that modify state
    public void activate() {
        this.status = LinkStatus.ACTIVE;
    }
}

// REST DTOs (Jackson needs setters for deserialization)
@Data
public class LinkDto {
    private String id;
    private String name;
    private String status;
}
```

**Advantages of @Data:**
- Mutable (setters provided)
- Works well with JPA entities
- Compatible with Jackson (setters for deserialization)
- Can add custom methods

### Comparison

```java
// Record: Immutable, concise
public record LinkGql(String id, String name) {}

// Equivalent with @Data: More verbose, mutable
@Data
@AllArgsConstructor
@NoArgsConstructor
public class LinkGql {
    private String id;
    private String name;
}
```

---

## MapStruct Basics

### Maven Dependency

```xml
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct</artifactId>
    <version>1.5.5.Final</version>
</dependency>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <configuration>
                <annotationProcessorPaths>
                    <path>
                        <groupId>org.mapstruct</groupId>
                        <artifactId>mapstruct-processor</artifactId>
                        <version>1.5.5.Final</version>
                    </path>
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok</artifactId>
                        <version>1.18.30</version>
                    </path>
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok-mapstruct-binding</artifactId>
                        <version>0.2.0</version>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
    </plugins>
</build>
```

### Basic Mapper Interface

```java
package com.company.project.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface FrontendMapper {

    // Domain to GraphQL
    LinkGql toGql(Link link);

    // GraphQL to Domain
    Link toDomain(CreateLinkInput input);
    Link toDomain(UpdateLinkInput input);

    // Enum mapping
    LinkStatusGql toGql(LinkStatus status);
    LinkStatus toDomain(LinkStatusGql status);
}
```

### Using Mappers in Controllers

```java
@Controller
@RequiredArgsConstructor
public class LinkController {
    private final LinkService linkService;
    private final FrontendMapper mapper;

    @QueryMapping("link")
    public LinkGql link(@Argument String radioId, @Argument String linkId) {
        Link link = linkService.getLink(radioId, linkId);
        return mapper.toGql(link);  // Map domain to GraphQL DTO
    }

    @MutationMapping("createLink")
    public LinkGql createLink(@Argument("input") @Valid CreateLinkInput input) {
        Link domain = mapper.toDomain(input);  // Map input to domain
        Link created = linkService.createLink(domain);
        return mapper.toGql(created);  // Map domain to GraphQL DTO
    }
}
```

---

## Advanced Mapping Patterns

### Field Name Mapping

```java
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface RadioMapper {

    @Mapping(source = "id", target = "radioId")
    @Mapping(source = "name", target = "radioName")
    RadioDto toDto(Radio radio);

    @Mapping(source = "radioId", target = "id")
    @Mapping(source = "radioName", target = "name")
    Radio toDomain(RadioDto dto);
}
```

### Nested Object Mapping

```java
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface RadioMapper {

    // Automatically maps nested Link objects
    RadioWithLinksGql toGql(Radio radio);

    LinkGql toGql(Link link);
}

// Domain model
@Data
public class Radio {
    private String id;
    private String name;
    private List<Link> links;
}

// GraphQL DTO
public record RadioWithLinksGql(
    String id,
    String name,
    List<LinkGql> links  // Automatically mapped using LinkGql toGql(Link)
) {}
```

### Collection Mapping

```java
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface FrontendMapper {

    // Single mapping
    LinkGql toGql(Link link);

    // Collection mapping (automatically generated)
    List<LinkGql> toGql(List<Link> links);

    Set<LinkGql> toGql(Set<Link> links);
}
```

### Expression Mapping

```java
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    imports = { UUID.class }
)
public interface LinkMapper {

    @Mapping(target = "id", expression = "java(UUID.randomUUID().toString())")
    @Mapping(target = "status", constant = "PENDING")
    Link toDomain(CreateLinkInput input);
}
```

### Default Values

```java
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface LinkMapper {

    @Mapping(target = "status", defaultValue = "INACTIVE")
    @Mapping(target = "description", defaultValue = "No description")
    Link toDomain(CreateLinkInput input);
}
```

### Custom Mapping Methods

```java
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface RadioMapper {

    @Mapping(source = "type", target = "typeCode", qualifiedByName = "typeToCode")
    RadioDto toDto(Radio radio);

    @Named("typeToCode")
    default String typeToCode(RadioType type) {
        return switch (type) {
            case TYPE_A -> "A";
            case TYPE_B -> "B";
            case TYPE_C -> "C";
        };
    }
}
```

### Using Other Mappers

```java
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    uses = { LinkMapper.class }
)
public interface RadioMapper {

    // Uses LinkMapper.toGql(Link) for each link
    RadioWithLinksGql toGql(Radio radio);
}
```

### Ignoring Fields

```java
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface LinkMapper {

    @Mapping(target = "id", ignore = true)  // Don't map id
    @Mapping(target = "createdAt", ignore = true)
    Link toDomain(UpdateLinkInput input);
}
```

### Update Methods

```java
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface LinkMapper {

    // Updates existing Link with values from input
    @Mapping(target = "id", ignore = true)  // Don't change ID
    @Mapping(target = "radioId", ignore = true)
    void updateFromInput(UpdateLinkInput input, @MappingTarget Link link);
}

// Usage in service
public Link updateLink(String linkId, UpdateLinkInput input) {
    Link link = repository.findById(linkId).orElseThrow();
    linkMapper.updateFromInput(input, link);  // Updates in place
    return repository.save(link);
}
```

### Unmapped Target Policy

```java
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.ERROR  // Fail if any field unmapped
)
public interface StrictMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Link toDomain(CreateLinkInput input);
}
```

---

## Best Practices

### 1. Separate DTOs by Layer

```java
// GOOD: Separate DTOs for each layer
package com.company.project.dto.gql;
public record LinkGql(...) {}

package com.company.project.dto.json;
public class LinkDto { }

package com.company.project.models;
public class Link { }

// BAD: Reusing DTOs across layers
package com.company.project.dto;
public class Link { }  // Used everywhere - tight coupling
```

### 2. Use Records for Immutable DTOs

```java
// GOOD: Records for immutable output types
public record LinkGql(String id, String name, LinkStatusGql status) {}

public record CreateLinkInput(@NotBlank String name, String description) {}

// BAD: @Data for simple immutable DTOs
@Data
@AllArgsConstructor
public class LinkGql {
    private final String id;
    private final String name;
    private final LinkStatusGql status;
}
```

### 3. Use @Data for Mutable Domain Models

```java
// GOOD: @Data for domain models
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Link {
    private String id;
    private String name;
    private LinkStatus status;

    public void activate() {
        this.status = LinkStatus.ACTIVE;
    }
}

// BAD: Records for mutable domain models
public record Link(String id, String name, LinkStatus status) {
    // Can't modify state!
}
```

### 4. Group Related Mappings

```java
// GOOD: One mapper per domain area
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface FrontendMapper {
    // All frontend (GraphQL) mappings
    LinkGql toGql(Link link);
    RadioGql toGql(Radio radio);
    Link toDomain(CreateLinkInput input);
}

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ExternalMapper {
    // All external API mappings
    Link toDomain(ExternalLinkDto dto);
    ExternalLinkDto toExternal(Link link);
}

// BAD: One giant mapper
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AllMapper {
    // 50+ mapping methods - hard to maintain
}
```

### 5. Handle Unmapped Fields Explicitly

```java
// GOOD: Explicit handling
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.ERROR
)
public interface LinkMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Link toDomain(CreateLinkInput input);
}

// BAD: Unmapped fields silently ignored
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface LinkMapper {
    Link toDomain(CreateLinkInput input);
    // What about id and createdAt? Unclear!
}
```

### 6. Use Validation Annotations on Input DTOs

```java
// GOOD: Validation on input DTOs
public record CreateLinkInput(
    @NotBlank(message = "Name is required")
    @Size(min = 3, max = 100)
    String name,

    @NotBlank(message = "Radio ID is required")
    String radioId
) {}

// BAD: No validation
public record CreateLinkInput(String name, String radioId) {}
```

---

## Common Pitfalls

### 1. Using Domain Models as DTOs

```java
// BAD: Exposing domain model directly
@QueryMapping("link")
public Link link(@Argument String linkId) {
    return linkService.getLink(linkId);  // Exposes internal structure
}

// GOOD: Use DTO
@QueryMapping("link")
public LinkGql link(@Argument String linkId) {
    Link link = linkService.getLink(linkId);
    return mapper.toGql(link);  // Clean API contract
}
```

### 2. Manual Mapping Instead of MapStruct

```java
// BAD: Manual mapping
public LinkGql toGql(Link link) {
    return new LinkGql(
        link.getId(),
        link.getName(),
        LinkStatusGql.valueOf(link.getStatus().name()),
        link.getDescription()
    );
}

// GOOD: MapStruct does it automatically
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface FrontendMapper {
    LinkGql toGql(Link link);
}
```

### 3. Missing componentModel Configuration

```java
// BAD: Missing componentModel
@Mapper
public interface FrontendMapper {
    LinkGql toGql(Link link);
}
// Can't inject as Spring bean!

// GOOD: Specify SPRING component model
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface FrontendMapper {
    LinkGql toGql(Link link);
}
// Automatically available as Spring bean
```

### 4. Not Handling Null Values

```java
// BAD: No null handling
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface LinkMapper {
    LinkGql toGql(Link link);
}

// Usage
LinkGql gql = mapper.toGql(null);  // NullPointerException!

// GOOD: Check for null
@QueryMapping("link")
public LinkGql link(@Argument String linkId) {
    Link link = linkService.getLink(linkId);
    if (link == null) {
        return null;  // Or throw exception
    }
    return mapper.toGql(link);
}
```

### 5. Circular Dependencies in Mappers

```java
// BAD: Circular dependency
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, uses = LinkMapper.class)
public interface RadioMapper {
    RadioGql toGql(Radio radio);
}

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, uses = RadioMapper.class)
public interface LinkMapper {
    LinkGql toGql(Link link);
}

// GOOD: One-way dependency or split mappers
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, uses = LinkMapper.class)
public interface RadioMapper {
    RadioGql toGql(Radio radio);
}

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface LinkMapper {
    LinkGql toGql(Link link);
}
```

### 6. Using Mutable DTOs for Input

```java
// BAD: Mutable input DTO
@Data
public class CreateLinkInput {
    @NotBlank
    private String name;
    private String description;
}
// Can be modified after validation!

// GOOD: Immutable input with record
public record CreateLinkInput(
    @NotBlank String name,
    String description
) {}
// Cannot be modified after creation
```

---

## Summary

DTO and mapping patterns provide clean separation between layers:

1. **Use records** for immutable DTOs (GraphQL, input types, config)
2. **Use @Data** for mutable objects (domain models, REST DTOs)
3. **Separate DTOs by layer**: `*Gql` (GraphQL), `*Dto` (REST), domain models
4. **MapStruct for mapping**: Type-safe, automatic, compile-time validated
5. **Configure `componentModel = SPRING`** for Spring bean integration
6. **Handle unmapped fields explicitly** with `unmappedTargetPolicy`
7. **Group related mappings** in focused mapper interfaces
8. **Validate input DTOs** with Jakarta Validation
9. **Never expose domain models** directly in APIs
10. **Use update methods** for in-place updates with `@MappingTarget`

Follow these patterns for clean, maintainable data transformation across layers.