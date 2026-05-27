# Lombok Guide

Comprehensive reference for Lombok annotations and best practices in Spring Boot applications.

---

## Table of Contents

1. [Common Annotations](#common-annotations)
2. [Data Annotations](#data-annotations)
3. [Constructor Annotations](#constructor-annotations)
4. [Builder Pattern](#builder-pattern)
5. [Logging](#logging)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)

---

## Common Annotations

### @Data

Generates getters, setters, `toString`, `equals`, and `hashCode`.

```java
import lombok.Data;

@Data
public class Link {
    private String id;
    private String name;
    private LinkStatus status;
    private String description;
}

// Equivalent to:
public class Link {
    private String id;
    private String name;
    private LinkStatus status;
    private String description;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    // ... all getters/setters

    @Override
    public String toString() { /* ... */ }

    @Override
    public boolean equals(Object o) { /* ... */ }

    @Override
    public int hashCode() { /* ... */ }
}
```

**Use for**: Mutable domain models, DTOs

### @Value

Creates immutable class with final fields, getters, `toString`, `equals`, and `hashCode`.

```java
import lombok.Value;

@Value
public class LinkInfo {
    String id;
    String name;
    LinkStatus status;
}

// Equivalent to:
public final class LinkInfo {
    private final String id;
    private final String name;
    private final LinkStatus status;

    public LinkInfo(String id, String name, LinkStatus status) {
        this.id = id;
        this.name = name;
        this.status = status;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public LinkStatus getStatus() { return status; }

    @Override
    public String toString() { /* ... */ }

    @Override
    public boolean equals(Object o) { /* ... */ }

    @Override
    public int hashCode() { /* ... */ }
}
```

**Use for**: Immutable value objects (but prefer Java records)

### @Getter and @Setter

Generate getters and/or setters.

```java
import lombok.Getter;
import lombok.Setter;

public class Radio {
    @Getter @Setter
    private String id;

    @Getter @Setter
    private String name;

    @Getter
    private final LocalDateTime createdAt = LocalDateTime.now();

    // No setter for createdAt - read-only
}
```

**Use for**: Fine-grained control over getters/setters

### @ToString

Generates `toString()` method.

```java
import lombok.ToString;

@ToString
public class Link {
    private String id;
    private String name;
    private LinkStatus status;
}

// Exclude fields
@ToString(exclude = {"password", "secretKey"})
public class User {
    private String username;
    private String password;
    private String secretKey;
}

// Include only specific fields
@ToString(onlyExplicitlyIncluded = true)
public class Radio {
    @ToString.Include
    private String id;

    @ToString.Include
    private String name;

    private String internalData;  // Not included in toString
}
```

### @EqualsAndHashCode

Generates `equals()` and `hashCode()` methods.

```java
import lombok.EqualsAndHashCode;

@EqualsAndHashCode
public class Link {
    private String id;
    private String name;
    private LinkStatus status;
}

// Only use id for equality
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Radio {
    @EqualsAndHashCode.Include
    private String id;

    private String name;
    private RadioStatus status;
}
```

---

## Data Annotations

### @Data for Domain Models

```java
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Radio {
    private String id;
    private String name;
    private RadioType type;
    private RadioStatus status;
    private List<Link> links;
}
```

**Generated methods:**
- All getters and setters
- `toString()`
- `equals()` and `hashCode()`
- Constructor (from `@NoArgsConstructor` and `@AllArgsConstructor`)
- Builder (from `@Builder`)

### @Data for DTOs

```java
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class RadioDto {
    private String id;
    private String name;

    @JsonProperty("radio_type")
    private String type;

    @JsonProperty("radio_status")
    private String status;
}
```

---

## Constructor Annotations

### @NoArgsConstructor

Generates no-argument constructor.

```java
import lombok.NoArgsConstructor;

@NoArgsConstructor
public class Radio {
    private String id;
    private String name;
}

// Equivalent to:
public class Radio {
    public Radio() {
    }
}
```

**Use for**: JPA entities, DTOs that need default constructor

### @AllArgsConstructor

Generates constructor with parameter for every field.

```java
import lombok.AllArgsConstructor;

@AllArgsConstructor
public class Link {
    private String id;
    private String name;
    private LinkStatus status;
}

// Equivalent to:
public class Link {
    public Link(String id, String name, LinkStatus status) {
        this.id = id;
        this.name = name;
        this.status = status;
    }
}
```

**Use for**: Value objects, immutable classes

### @RequiredArgsConstructor

Generates constructor for final and `@NonNull` fields only.

```java
import lombok.RequiredArgsConstructor;
import lombok.NonNull;

@RequiredArgsConstructor
public class RadioService {
    private final RadioRepository radioRepository;
    private final RadioClient radioClient;

    @NonNull
    private Logger logger;

    private String optionalField;  // Not in constructor
}

// Equivalent to:
public class RadioService {
    private final RadioRepository radioRepository;
    private final RadioClient radioClient;
    private Logger logger;
    private String optionalField;

    public RadioService(RadioRepository radioRepository, RadioClient radioClient, Logger logger) {
        this.radioRepository = radioRepository;
        this.radioClient = radioClient;
        this.logger = logger;
    }
}
```

**Use for**: Dependency injection in Spring components

---

## Builder Pattern

### Basic Builder

```java
import lombok.Builder;

@Builder
public class Radio {
    private String id;
    private String name;
    private RadioType type;
    private RadioStatus status;
}

// Usage:
Radio radio = Radio.builder()
    .id("radio-123")
    .name("Test Radio")
    .type(RadioType.TYPE_A)
    .status(RadioStatus.ACTIVE)
    .build();
```

### Builder with Default Values

```java
import lombok.Builder;

@Builder
public class Radio {
    private String id;
    private String name;
    private RadioType type;

    @Builder.Default
    private RadioStatus status = RadioStatus.INACTIVE;

    @Builder.Default
    private List<Link> links = new ArrayList<>();
}

// Usage:
Radio radio = Radio.builder()
    .name("Test Radio")
    .type(RadioType.TYPE_A)
    .build();  // status = INACTIVE, links = empty list
```

### Builder with @Data

```java
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Link {
    private String id;
    private String name;
    private LinkStatus status;
}

// Can use both builder and setters:
Link link = Link.builder()
    .name("Link 1")
    .status(LinkStatus.ACTIVE)
    .build();

link.setName("Updated Link");  // Setter also available
```

### Singular Collections

```java
import lombok.Builder;
import lombok.Singular;

@Builder
public class Radio {
    private String id;
    private String name;

    @Singular
    private List<Link> links;

    @Singular("tag")
    private Set<String> tags;
}

// Usage:
Radio radio = Radio.builder()
    .name("Test Radio")
    .link(link1)  // Add single link
    .link(link2)  // Add another link
    .tag("important")
    .tag("active")
    .build();
```

---

## Logging

### @Slf4j

Generates SLF4J logger field.

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class RadioService {
    public Radio getRadio(String radioId) {
        log.info("Fetching radio: {}", radioId);
        log.debug("Detailed info: {}", details);
        log.error("Error occurred", exception);
        return radio;
    }
}

// Equivalent to:
public class RadioService {
    private static final org.slf4j.Logger log =
        org.slf4j.LoggerFactory.getLogger(RadioService.class);

    public Radio getRadio(String radioId) {
        log.info("Fetching radio: {}", radioId);
        return radio;
    }
}
```

### Other Logger Annotations

```java
@Log  // java.util.logging.Logger
@Log4j  // Log4j logger
@Log4j2  // Log4j2 logger
@CommonsLog  // Apache Commons Logging
```

**Use**: `@Slf4j` (most common with Spring Boot)

---

## Best Practices

### 1. Use @RequiredArgsConstructor for Dependency Injection

```java
// GOOD: Constructor injection with @RequiredArgsConstructor
@Service
@RequiredArgsConstructor
public class RadioService {
    private final RadioRepository radioRepository;
    private final RadioClient radioClient;
}

// BAD: Field injection
@Service
public class RadioService {
    @Autowired
    private RadioRepository radioRepository;

    @Autowired
    private RadioClient radioClient;
}
```

### 2. Combine @Data with @Builder

```java
// GOOD: Flexible with builder and setters
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Radio {
    private String id;
    private String name;
}

// Can use builder:
Radio radio = Radio.builder().name("Test").build();

// Or setters:
radio.setName("Updated");
```

### 3. Use @Slf4j for Logging

```java
// GOOD: Lombok logger
@Service
@Slf4j
public class RadioService {
    public void process() {
        log.info("Processing...");
    }
}

// BAD: Manual logger
@Service
public class RadioService {
    private static final Logger log = LoggerFactory.getLogger(RadioService.class);

    public void process() {
        log.info("Processing...");
    }
}
```

### 4. Exclude Sensitive Fields from @ToString

```java
// GOOD: Exclude sensitive data
@Data
@ToString(exclude = {"password", "apiKey"})
public class User {
    private String username;
    private String password;
    private String apiKey;
}

// BAD: Exposing sensitive data
@Data
public class User {
    private String username;
    private String password;  // Visible in toString!
}
```

### 5. Use @Builder.Default for Default Values

```java
// GOOD: Default values with @Builder.Default
@Builder
public class Radio {
    private String name;

    @Builder.Default
    private RadioStatus status = RadioStatus.INACTIVE;

    @Builder.Default
    private List<Link> links = new ArrayList<>();
}

// BAD: Null values without defaults
@Builder
public class Radio {
    private String name;
    private RadioStatus status;  // null if not set
    private List<Link> links;    // null if not set
}
```

### 6. Add @NoArgsConstructor for JPA Entities

```java
// GOOD: Both constructors for JPA
@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RadioEntity {
    @Id
    private String id;
    private String name;
}

// BAD: Missing no-args constructor (JPA requires it)
@Entity
@Data
@AllArgsConstructor
public class RadioEntity {
    @Id
    private String id;
    private String name;
}
```

---

## Common Pitfalls

### 1. Missing @NoArgsConstructor with @Builder

```java
// BAD: Can't use builder with JPA
@Entity
@Data
@Builder
public class RadioEntity {
    @Id
    private String id;
}

// Error: JPA requires no-args constructor
// Builder removes default constructor

// GOOD: Add @NoArgsConstructor
@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RadioEntity {
    @Id
    private String id;
}
```

### 2. Using @Data on Entities with Relationships

```java
// BAD: @Data with JPA relationships
@Entity
@Data
public class Radio {
    @Id
    private String id;

    @OneToMany(mappedBy = "radio")
    private List<Link> links;
}

// toString() causes infinite loop if Link also has @Data!

// GOOD: Exclude relationships from toString
@Entity
@Data
@ToString(exclude = "links")
@EqualsAndHashCode(exclude = "links")
public class Radio {
    @Id
    private String id;

    @OneToMany(mappedBy = "radio")
    private List<Link> links;
}
```

### 3. Not Using @RequiredArgsConstructor for Final Fields

```java
// BAD: Manual constructor
@Service
public class RadioService {
    private final RadioRepository repository;
    private final RadioClient client;

    public RadioService(RadioRepository repository, RadioClient client) {
        this.repository = repository;
        this.client = client;
    }
}

// GOOD: Use @RequiredArgsConstructor
@Service
@RequiredArgsConstructor
public class RadioService {
    private final RadioRepository repository;
    private final RadioClient client;
}
```

### 4. Forgetting @Slf4j

```java
// BAD: No logger annotation
@Service
public class RadioService {
    public void process() {
        // Can't log!
    }
}

// GOOD: Add @Slf4j
@Service
@Slf4j
public class RadioService {
    public void process() {
        log.info("Processing...");
    }
}
```

### 5. Using @Value Instead of Records

```java
// BAD: Using @Value (verbose)
@Value
public class LinkInfo {
    String id;
    String name;
    LinkStatus status;
}

// GOOD: Use Java record (cleaner)
public record LinkInfo(
    String id,
    String name,
    LinkStatus status
) {}
```

### 6. Not Excluding Lombok from Equals/HashCode

```java
// BAD: Including all fields in equals
@Data
public class User {
    private String id;
    private String username;
    private String password;
    private LocalDateTime lastLogin;
}

// lastLogin changes affect equals/hashCode!

// GOOD: Only use id for equality
@Data
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class User {
    @EqualsAndHashCode.Include
    private String id;

    private String username;
    private String password;
    private LocalDateTime lastLogin;
}
```

---

## Annotation Cheatsheet

| Annotation | Purpose | Use For |
|------------|---------|---------|
| `@Data` | Getters, setters, toString, equals, hashCode | Mutable classes |
| `@Value` | Immutable class with getters | Value objects (prefer records) |
| `@Getter` | Generate getters | Fine control |
| `@Setter` | Generate setters | Fine control |
| `@ToString` | Generate toString() | Any class |
| `@EqualsAndHashCode` | Generate equals() and hashCode() | Any class |
| `@NoArgsConstructor` | No-argument constructor | JPA entities, DTOs |
| `@AllArgsConstructor` | Constructor with all fields | Value objects |
| `@RequiredArgsConstructor` | Constructor for final/@NonNull fields | Dependency injection |
| `@Builder` | Builder pattern | Creating objects |
| `@Slf4j` | SLF4J logger field | Logging |

---

## Common Combinations

### Service Class

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {
    private final RadioRepository repository;
    private final RadioClient client;
}
```

### Domain Model

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Radio {
    private String id;
    private String name;
    private RadioStatus status;
}
```

### JPA Entity

```java
@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "links")
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class RadioEntity {
    @Id
    @EqualsAndHashCode.Include
    private String id;

    private String name;

    @OneToMany(mappedBy = "radio")
    private List<LinkEntity> links;
}
```

### REST DTO

```java
@Data
public class RadioDto {
    private String id;
    private String name;

    @JsonProperty("radio_status")
    private String status;
}
```

---

## Summary

Lombok provides powerful code generation for Java classes:

1. **`@Data`**: Complete data class with getters, setters, toString, equals, hashCode
2. **`@Builder`**: Builder pattern for object creation
3. **`@RequiredArgsConstructor`**: Constructor injection for Spring components
4. **`@Slf4j`**: Logging support
5. **`@NoArgsConstructor` + `@AllArgsConstructor`**: Flexible constructor options
6. **`@ToString(exclude)`**: Control toString output
7. **`@EqualsAndHashCode(onlyExplicitlyIncluded)`**: Control equality logic

Use Lombok to reduce boilerplate while maintaining clean, readable code. Prefer Java records over `@Value` for immutable value objects.