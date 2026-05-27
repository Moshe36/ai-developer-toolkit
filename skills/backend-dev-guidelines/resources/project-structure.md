# Project Structure

Comprehensive guide to organizing Spring Boot backend projects using package-by-feature structure.

---

## Table of Contents

1. [Overview](#overview)
2. [Package Structure](#package-structure)
3. [Controllers Layer](#controllers-layer)
4. [Services Layer](#services-layer)
5. [Repositories Layer](#repositories-layer)
6. [Models and DTOs](#models-and-dtos)
7. [Mappers](#mappers)
8. [Infrastructure](#infrastructure)
9. [Resources](#resources)
10. [Best Practices](#best-practices)

---

## Overview

### Package-by-Feature Structure

Organize code by domain features rather than technical layers:

```
com.company.project.backend/
├── controllers/          # GraphQL/REST controllers
│   └── frontend/        # Frontend-facing controllers
├── services/            # Business logic layer
├── repositories/        # Data access layer
├── models/             # Domain models
├── dto/                # Data Transfer Objects
│   ├── gql/           # GraphQL DTOs
│   ├── json/          # REST JSON DTOs
│   └── external/      # External system DTOs
├── mappers/           # MapStruct mappers
├── clients/           # External API clients
├── enums/             # Enumerations
├── infrastructure/    # Cross-cutting concerns
│   ├── beans/        # Configuration beans
│   ├── exceptions/   # Exception classes
│   └── handlers/     # Global handlers
├── utils/            # Utility classes
└── constants/        # Application constants
```

### Why Package-by-Feature?

**Benefits:**
- Related code stays together
- Easy to find and modify features
- Clear domain boundaries
- Easier to split into microservices later
- Better encapsulation

---

## Package Structure

### Complete Example

```
src/
├── main/
│   ├── java/
│   │   └── com/
│   │       └── company/
│   │           └── project/
│   │               └── backend/
│   │                   ├── Application.java
│   │                   │
│   │                   ├── controllers/
│   │                   │   └── frontend/
│   │                   │       ├── RadioController.java
│   │                   │       ├── LinkController.java
│   │                   │       └── UserController.java
│   │                   │
│   │                   ├── services/
│   │                   │   ├── RadioService.java
│   │                   │   ├── LinkService.java
│   │                   │   └── UserService.java
│   │                   │
│   │                   ├── repositories/
│   │                   │   ├── RadioRepository.java
│   │                   │   ├── LinkRepository.java
│   │                   │   └── UserRepository.java
│   │                   │
│   │                   ├── models/
│   │                   │   ├── Radio.java
│   │                   │   ├── Link.java
│   │                   │   └── User.java
│   │                   │
│   │                   ├── dto/
│   │                   │   ├── gql/
│   │                   │   │   ├── RadioGql.java
│   │                   │   │   ├── LinkGql.java
│   │                   │   │   ├── CreateRadioInput.java
│   │                   │   │   └── UpdateLinkInput.java
│   │                   │   ├── json/
│   │                   │   │   ├── RadioDto.java
│   │                   │   │   ├── LinkDto.java
│   │                   │   │   └── CreateRadioRequest.java
│   │                   │   └── external/
│   │                   │       └── ExternalRadioDto.java
│   │                   │
│   │                   ├── mappers/
│   │                   │   ├── FrontendMapper.java
│   │                   │   ├── RestMapper.java
│   │                   │   └── ExternalMapper.java
│   │                   │
│   │                   ├── clients/
│   │                   │   └── RadioClient.java
│   │                   │
│   │                   ├── enums/
│   │                   │   ├── RadioType.java
│   │                   │   ├── RadioStatus.java
│   │                   │   └── LinkStatus.java
│   │                   │
│   │                   ├── infrastructure/
│   │                   │   ├── beans/
│   │                   │   │   ├── AppConfigs.java
│   │                   │   │   ├── CacheConfiguration.java
│   │                   │   │   └── WebClientConfiguration.java
│   │                   │   ├── exceptions/
│   │                   │   │   ├── ResourceNotFoundException.java
│   │                   │   │   ├── ResourceAlreadyExistsException.java
│   │                   │   │   └── InvalidOperationException.java
│   │                   │   └── handlers/
│   │                   │       ├── GlobalRestExceptionHandler.java
│   │                   │       └── GraphQLExceptionHandler.java
│   │                   │
│   │                   ├── utils/
│   │                   │   └── StringUtils.java
│   │                   │
│   │                   └── constants/
│   │                       └── AppConstants.java
│   │
│   └── resources/
│       ├── application.yml
│       ├── application-dev.yml
│       ├── application-prod.yml
│       └── graphql/
│           ├── schema.graphqls
│           ├── query.graphqls
│           ├── mutation.graphqls
│           ├── types/
│           │   ├── radio.graphqls
│           │   └── link.graphqls
│           └── inputs/
│               ├── radio-inputs.graphqls
│               └── link-inputs.graphqls
│
└── test/
    └── java/
        └── com/
            └── company/
                └── project/
                    └── backend/
                        ├── controllers/
                        │   └── RadioControllerTest.java
                        ├── services/
                        │   └── RadioServiceTest.java
                        └── repositories/
                            └── RadioRepositoryTest.java
```

---

## Controllers Layer

### Purpose

Controllers handle incoming requests and return responses:
- **GraphQL Controllers**: Handle GraphQL queries and mutations
- **REST Controllers**: Handle HTTP REST requests

### GraphQL Controller Example

**File**: `controllers/frontend/RadioController.java`

```java
package com.company.project.backend.controllers.frontend;

import com.company.project.backend.services.RadioService;
import com.company.project.backend.mappers.FrontendMapper;
import com.company.project.backend.dto.gql.*;
import org.springframework.graphql.data.method.annotation.*;
import org.springframework.stereotype.Controller;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class RadioController {
    private final RadioService radioService;
    private final FrontendMapper mapper;

    @QueryMapping("radio")
    public RadioGql radio(@Argument("radioId") @NotBlank String radioId) {
        return mapper.toGql(radioService.getRadio(radioId));
    }

    @MutationMapping("createRadio")
    public RadioGql createRadio(@Argument("input") @Valid CreateRadioInput input) {
        return mapper.toGql(radioService.createRadio(mapper.toDomain(input)));
    }
}
```

### REST Controller Example

**File**: `controllers/frontend/RadioRestController.java`

```java
package com.company.project.backend.controllers.frontend;

import com.company.project.backend.services.RadioService;
import com.company.project.backend.mappers.RestMapper;
import com.company.project.backend.dto.json.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/radios")
@RequiredArgsConstructor
@Tag(name = "Radio Management")
public class RadioRestController {
    private final RadioService radioService;
    private final RestMapper mapper;

    @GetMapping("/{radioId}")
    @Operation(summary = "Get radio by ID")
    public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
        return ResponseEntity.ok(mapper.toDto(radioService.getRadio(radioId)));
    }

    @PostMapping
    @Operation(summary = "Create new radio")
    public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(mapper.toDto(radioService.createRadio(mapper.toDomain(request))));
    }
}
```

---

## Services Layer

### Purpose

Services contain business logic and coordinate between repositories and external clients.

### Service Example

**File**: `services/RadioService.java`

```java
package com.company.project.backend.services;

import com.company.project.backend.repositories.RadioRepository;
import com.company.project.backend.clients.RadioClient;
import com.company.project.backend.models.Radio;
import com.company.project.backend.enums.RadioStatus;
import com.company.project.backend.infrastructure.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {
    private final RadioRepository radioRepository;
    private final RadioClient radioClient;

    public Radio getRadio(String radioId) {
        log.info("Fetching radio: {}", radioId);
        return radioRepository.findById(radioId)
            .orElseThrow(() -> new ResourceNotFoundException("Radio", radioId));
    }

    public Radio createRadio(CreateRadioCommand command) {
        log.info("Creating radio: {}", command.getName());

        Radio radio = Radio.builder()
            .name(command.getName())
            .type(command.getType())
            .status(RadioStatus.INACTIVE)
            .build();

        Radio saved = radioRepository.save(radio);
        radioClient.createRadio(saved);

        log.info("Created radio: {}", saved.getId());
        return saved;
    }
}
```

---

## Repositories Layer

### Purpose

Repositories abstract data access and provide CRUD operations.

### Repository Example

**File**: `repositories/RadioRepository.java`

```java
package com.company.project.backend.repositories;

import com.company.project.backend.models.Radio;
import com.company.project.backend.enums.RadioStatus;
import org.springframework.stereotype.Repository;
import lombok.extern.slf4j.Slf4j;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
@Slf4j
public class RadioRepository {
    private final Map<String, Radio> radios = new ConcurrentHashMap<>();

    public Optional<Radio> findById(String id) {
        log.debug("Finding radio by id: {}", id);
        return Optional.ofNullable(radios.get(id));
    }

    public List<Radio> findAll() {
        log.debug("Finding all radios");
        return new ArrayList<>(radios.values());
    }

    public Radio save(Radio radio) {
        if (radio.getId() == null) {
            radio.setId(UUID.randomUUID().toString());
        }
        log.debug("Saving radio: {}", radio.getId());
        radios.put(radio.getId(), radio);
        return radio;
    }

    public void deleteById(String id) {
        log.debug("Deleting radio: {}", id);
        radios.remove(id);
    }

    public boolean existsByName(String name) {
        return radios.values().stream()
            .anyMatch(radio -> radio.getName().equals(name));
    }
}
```

---

## Models and DTOs

### Domain Models

**File**: `models/Radio.java`

```java
package com.company.project.backend.models;

import com.company.project.backend.enums.RadioType;
import com.company.project.backend.enums.RadioStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

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

    public Link getLinkById(String linkId) {
        return links.stream()
            .filter(link -> link.getId().equals(linkId))
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Link not found: " + linkId));
    }
}
```

### GraphQL DTOs

**File**: `dto/gql/RadioGql.java`

```java
package com.company.project.backend.dto.gql;

import java.util.List;

public record RadioGql(
    String id,
    String name,
    RadioTypeGql type,
    RadioStatusGql status,
    List<LinkGql> links
) {}
```

**File**: `dto/gql/CreateRadioInput.java`

```java
package com.company.project.backend.dto.gql;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRadioInput(
    @NotBlank(message = "Name is required")
    @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    String name,

    @NotBlank(message = "Type is required")
    RadioTypeGql type
) {}
```

### REST DTOs

**File**: `dto/json/RadioDto.java`

```java
package com.company.project.backend.dto.json;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class RadioDto {
    private String id;
    private String name;

    @JsonProperty("radio_type")
    private String type;

    @JsonProperty("radio_status")
    private String status;

    private List<LinkDto> links;
}
```

### Enums

**File**: `enums/RadioStatus.java`

```java
package com.company.project.backend.enums;

public enum RadioStatus {
    ACTIVE,
    INACTIVE,
    PENDING,
    ARCHIVED
}
```

---

## Mappers

### Purpose

Mappers handle conversion between different object types (DTOs, domain models).

### Mapper Example

**File**: `mappers/FrontendMapper.java`

```java
package com.company.project.backend.mappers;

import com.company.project.backend.models.*;
import com.company.project.backend.dto.gql.*;
import com.company.project.backend.enums.*;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface FrontendMapper {

    // Domain to GraphQL
    RadioGql toGql(Radio radio);
    LinkGql toGql(Link link);

    // GraphQL to Domain
    Radio toDomain(CreateRadioInput input);
    Link toDomain(CreateLinkInput input);

    // Enum mapping
    RadioStatusGql toGql(RadioStatus status);
    RadioStatus toDomain(RadioStatusGql status);

    RadioTypeGql toGql(RadioType type);
    RadioType toDomain(RadioTypeGql type);
}
```

---

## Infrastructure

### Configuration Beans

**File**: `infrastructure/beans/AppConfigs.java`

```java
package com.company.project.backend.infrastructure.beans;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "app.configs")
@Validated
@Slf4j
public record AppConfigs(
    @JsonProperty("http-timeout-ms")
    @DefaultValue("5000")
    int httpTimeoutMs,

    @JsonProperty("cache-size")
    @DefaultValue("1000")
    int cacheSize
) {
    @PostConstruct
    public void init() {
        log.info("Loaded configuration: {}", this);
    }
}
```

### Custom Exceptions

**File**: `infrastructure/exceptions/ResourceNotFoundException.java`

```java
package com.company.project.backend.infrastructure.exceptions;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resourceType, String resourceId) {
        super(String.format("%s not found with ID: %s", resourceType, resourceId));
    }
}
```

### Exception Handlers

**File**: `infrastructure/handlers/GlobalRestExceptionHandler.java`

```java
package com.company.project.backend.infrastructure.handlers;

import com.company.project.backend.infrastructure.exceptions.ResourceNotFoundException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import lombok.extern.slf4j.Slf4j;

@RestControllerAdvice
@Slf4j
public class GlobalRestExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        log.error("Resource not found: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
}
```

---

## Resources

### Application Configuration

**File**: `resources/application.yml`

```yaml
spring:
  application:
    name: radio-backend
  threads:
    virtual:
      enabled: true

app:
  configs:
    http-timeout-ms: 5000
    cache-size: 1000

logging:
  level:
    root: INFO
    com.company.project: DEBUG
```

### GraphQL Schema

**File**: `resources/graphql/schema.graphqls`

```graphql
schema {
  query: Query
  mutation: Mutation
}
```

**File**: `resources/graphql/query.graphqls`

```graphql
type Query {
  radio(radioId: ID!): Radio
  radios: [Radio!]!
  link(radioId: ID!, linkId: ID!): Link
}
```

**File**: `resources/graphql/types/radio.graphqls`

```graphql
type Radio {
  id: ID!
  name: String!
  type: RadioType!
  status: RadioStatus!
  links: [Link!]!
}

enum RadioType {
  TYPE_A
  TYPE_B
  TYPE_C
}

enum RadioStatus {
  ACTIVE
  INACTIVE
  PENDING
}
```

---

## Best Practices

### 1. Package-by-Feature

```
// GOOD: Package by feature
com.company.project/
├── controllers/
├── services/
├── repositories/
└── models/

// BAD: Package by layer with mixed domains
com.company.project/
├── controllers/
│   ├── RadioController.java
│   ├── LinkController.java
│   ├── UserController.java
│   └── OrderController.java  // Unrelated domain
```

### 2. Consistent Naming

```java
// GOOD: Consistent naming
RadioController.java      // Controller
RadioService.java        // Service
RadioRepository.java     // Repository
Radio.java              // Domain model
RadioGql.java           // GraphQL DTO
RadioDto.java           // REST DTO

// BAD: Inconsistent naming
RadioCtrl.java
RadioSvc.java
RadioRepo.java
```

### 3. Separate DTOs by Usage

```
dto/
├── gql/               # GraphQL DTOs
│   ├── RadioGql.java
│   └── CreateRadioInput.java
├── json/              # REST DTOs
│   ├── RadioDto.java
│   └── CreateRadioRequest.java
└── external/          # External API DTOs
    └── ExternalRadioDto.java
```

### 4. Group Related Configuration

```
infrastructure/
├── beans/             # Configuration beans
│   ├── AppConfigs.java
│   └── CacheConfiguration.java
├── exceptions/        # Custom exceptions
│   └── ResourceNotFoundException.java
└── handlers/          # Global handlers
    └── GlobalRestExceptionHandler.java
```

### 5. Keep Test Structure Mirror Production

```
src/
├── main/java/com/company/project/
│   ├── controllers/RadioController.java
│   ├── services/RadioService.java
│   └── repositories/RadioRepository.java
└── test/java/com/company/project/
    ├── controllers/RadioControllerTest.java
    ├── services/RadioServiceTest.java
    └── repositories/RadioRepositoryTest.java
```

---

## Summary

Well-organized Spring Boot projects follow these principles:

1. **Package-by-feature**: Group related code together
2. **Clear layer separation**: Controllers → Services → Repositories
3. **Separate DTOs**: Different DTOs for GraphQL, REST, domain, external
4. **Infrastructure package**: Cross-cutting concerns (config, exceptions, handlers)
5. **Consistent naming**: Clear, descriptive names following conventions
6. **Resource organization**: GraphQL schemas in types/ and inputs/ subdirectories
7. **Test structure**: Mirror production code structure
8. **Configuration management**: Profile-specific YAML files

This structure provides:
- Easy navigation and maintenance
- Clear boundaries between layers
- Scalability for growing applications
- Easier refactoring and testing
- Better collaboration in teams