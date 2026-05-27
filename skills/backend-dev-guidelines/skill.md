---
name: backend-dev-guidelines
description: Backend development guidelines for Java 21, Spring Boot 3.x, GraphQL, REST APIs, MapStruct, Lombok, and Spring ecosystem. Use when creating or modifying controllers, services, repositories, DTOs, mappers, configurations, or GraphQL schemas in Java Spring Boot projects.
---

# Backend Development Guidelines

**Stack:** Java 21 + Spring Boot 3.x + GraphQL + REST + MapStruct + Lombok

## When to Use

- Creating or modifying Spring Boot backend components
- Implementing GraphQL queries/mutations or REST endpoints
- Working with services, repositories, DTOs, or mappers
- Configuring beans, exception handlers, or application settings

---

## Quick Decision Tree

```
Task?
├─ New API Endpoint
│  ├─ GraphQL?
│  │  ├─ @Controller + @QueryMapping/@MutationMapping
│  │  ├─ Validate with @Valid + @NotBlank
│  │  └─ Map DTO: mapper.toGql(domain)
│  └─ REST?
│     ├─ @RestController + @GetMapping/@PostMapping
│     ├─ Return: ResponseEntity<T>
│     └─ Add: @Operation for OpenAPI docs
│
├─ Business Logic
│  ├─ Create @Service
│  ├─ Use @RequiredArgsConstructor + @Slf4j
│  ├─ Coordinate between repository + clients
│  └─ Throw domain exceptions (NoSuchElementException)
│
├─ Data Access
│  ├─ In-memory? → @Repository + thread-safe collections
│  ├─ Database? → Spring Data JPA + @Repository
│  └─ Return: Optional<T> for nullable
│
├─ DTO Mapping
│  ├─ GraphQL DTO → record LinkGql(...) {}
│  ├─ Domain model → @Data @Builder class
│  ├─ Mapper → @Mapper(componentModel = SPRING)
│  └─ Map: mapper.toGql(domain) / mapper.toDomain(input)
│
├─ Error Handling
│  ├─ @ControllerAdvice for global handler
│  ├─ @ExceptionHandler per exception type
│  └─ Return: ResponseEntity with proper HTTP status
│
├─ Configuration
│  ├─ Use record + @ConfigurationProperties(prefix="app")
│  ├─ Add @Validated for validation
│  └─ Inject via constructor
│
└─ Validation/Caching
   ├─ Validation → @Valid + Jakarta constraints
   └─ Caching → @Cacheable/@CacheEvict (Caffeine)
```

---

## Essential Checklists

### GraphQL Controller
- [ ] `@Controller` + `@RequiredArgsConstructor`
- [ ] `@QueryMapping`/`@MutationMapping`
- [ ] Validate: `@Valid` + `@NotBlank`
- [ ] Map: `mapper.toGql(domain)`
- [ ] Thin controller - delegate to service

### REST Controller
- [ ] `@RestController` + `@RequestMapping("/api/v1/...")`
- [ ] `ResponseEntity<T>` with HTTP status
- [ ] OpenAPI: `@Operation` + `@Tag`
- [ ] Validate: `@Valid` on `@RequestBody`

### Service
- [ ] `@Service` + `@RequiredArgsConstructor` + `@Slf4j`
- [ ] Single responsibility
- [ ] Log important operations
- [ ] Domain exceptions (not generic)

### Repository
- [ ] `@Repository` annotation
- [ ] Thread-safe collections if in-memory
- [ ] Return `Optional<T>` for nullable results
- [ ] Defensive copies for collections

### MapStruct Mapper
- [ ] `@Mapper(componentModel = SPRING)`
- [ ] Interface or abstract class
- [ ] `@Mapping` for different field names
- [ ] Handle unmapped fields explicitly

---

## Import Cheatsheet

```java
// Spring Core
import org.springframework.stereotype.*;
import org.springframework.context.annotation.*;

// GraphQL
import org.springframework.graphql.data.method.annotation.*;

// REST
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;

// Validation
import jakarta.validation.*;
import jakarta.validation.constraints.*;

// Lombok
import lombok.*;
import lombok.extern.slf4j.Slf4j;

// MapStruct
import org.mapstruct.*;

// Configuration
import org.springframework.boot.context.properties.ConfigurationProperties;

// Exception Handling
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

// Caching
import org.springframework.cache.annotation.*;
```

---

## Core Patterns

### GraphQL Controller
```java
@Controller
@RequiredArgsConstructor
public class LinkController {
    private final LinkService service;
    private final FrontendMapper mapper;

    @QueryMapping("link")
    public LinkGql link(@Argument("id") @NotBlank String id) {
        return mapper.toGql(service.getLink(id));
    }

    @MutationMapping("updateLink")
    public LinkGql updateLink(@Argument("input") @Valid UpdateLinkInput input) {
        return mapper.toGql(service.updateLink(mapper.toDomain(input)));
    }
}
```

### REST Controller
```java
@RestController
@RequestMapping("/api/v1/radios")
@RequiredArgsConstructor
@Tag(name = "Radio Management")
public class RadioRestController {
    private final RadioService radioService;
    private final RadioMapper mapper;

    @GetMapping("/{radioId}")
    @Operation(summary = "Get radio by ID")
    public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
        return ResponseEntity.ok(mapper.toDto(radioService.getRadio(radioId)));
    }

    @PostMapping
    public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
        Radio created = radioService.createRadio(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toDto(created));
    }
}
```

### Service
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class LinkService {
    private final LinkRepository repository;
    private final RadioClient client;

    public Link getLink(String id) {
        log.info("Fetching link: {}", id);
        return repository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Link not found: " + id));
    }

    public Link updateLink(UpdateLinkCommand command) {
        log.info("Updating link: {}", command.getId());
        Link link = getLink(command.getId());
        client.updateExternal(command);
        return repository.save(link);
    }
}
```

### DTOs
```java
// GraphQL DTO (immutable)
public record LinkGql(String id, String name, LinkStatusGql status) {}

// Input with validation
public record UpdateLinkInput(
    @NotBlank String linkId,
    @Min(0) @Max(30) Integer txPower
) {}

// Domain model
@Data
@Builder
public class Link {
    private String id;
    private String name;
    private LinkStatus status;
}
```

### Mapper
```java
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface FrontendMapper {
    LinkGql toGql(Link link);

    @Mapping(target = "id", source = "linkId")
    Link toDomain(UpdateLinkInput input);
}
```

### Exception Handler
```java
@ControllerAdvice
@Slf4j
public class GlobalRestExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(e -> errors.put(e.getField(), e.getDefaultMessage()));
        log.warn("Validation error: {}", errors);
        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoSuchElementException ex) {
        log.warn("Not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("error", ex.getMessage()));
    }
}
```

### Configuration
```java
@ConfigurationProperties(prefix = "app.configs")
@Validated
public record AppConfigs(
    @JsonProperty("http-timeout-ms") @DefaultValue("5000") int httpTimeoutMs,
    @JsonProperty("cache-size") @DefaultValue("1000") int cacheSize
) {}

// Enable in main application class
@SpringBootApplication
@ConfigurationPropertiesScan
public class Application {}
```

---

## Project Structure

```
com.{company}.{project}.backend/
├── controllers/frontend/    # GraphQL/REST controllers
├── services/               # Business logic
├── repositories/           # Data access
├── models/                # Domain models
├── dto/
│   ├── gql/               # GraphQL DTOs
│   └── json/              # REST DTOs
├── mappers/               # MapStruct mappers
├── clients/               # External API clients
├── infrastructure/
│   ├── beans/            # Configuration
│   ├── exceptions/       # Exception handlers
│   └── handlers/         # Global handlers
└── constants/            # App constants
```

---

## Resource Guide

| Need | Read |
|------|------|
| Project structure | [project-structure.md](resources/project-structure.md) |
| Controllers/Services | [core-patterns.md](resources/core-patterns.md) |
| GraphQL APIs | [graphql-patterns.md](resources/graphql-patterns.md) |
| REST APIs | [rest-api-patterns.md](resources/rest-api-patterns.md) |
| DTOs/MapStruct | [dto-and-mapping.md](resources/dto-and-mapping.md) |
| Exception handling | [exception-handling.md](resources/exception-handling.md) |
| Configuration | [configuration.md](resources/configuration.md) |
| Validation/Caching | [validation-and-caching.md](resources/validation-and-caching.md) |
| Testing | [testing.md](resources/testing.md) |
| Lombok guide | [lombok-guide.md](resources/lombok-guide.md) |

---

## Core Rules

1. **Constructor injection**: `@RequiredArgsConstructor` or `@AllArgsConstructor`
2. **Thin controllers**: Delegate to services
3. **DTO separation**: GraphQL (`*Gql`), JSON (`*Dto`), Domain
4. **MapStruct strict**: Unmapped policy = ERROR
5. **Domain exceptions**: Custom > generic
6. **Validation first**: `@Valid` on external inputs
7. **Logging**: `@Slf4j` + log important operations
8. **Records for config**: Java 21 records + `@ConfigurationProperties`
9. **Virtual threads**: Enabled for scalability
10. **Type safety**: Leverage Java 21 features

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Java 21 | Virtual threads, records, pattern matching |
| Spring Boot 3.4.x | Framework |
| Spring GraphQL | GraphQL + WebSocket |
| MapStruct | Type-safe mapping |
| Lombok | Boilerplate reduction |
| Caffeine | Caching |
| Jakarta Validation | Input validation |
| OpenAPI/Swagger | API docs |

---

## Related Skills

- **frontend-dev-guidelines**: Frontend consuming these APIs
- **error-tracking**: Sentry integration