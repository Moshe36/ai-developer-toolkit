# Core Patterns

Fundamental patterns for Java Spring Boot backend development: dependency injection, service layer, repository pattern, and DTO pattern.

---

## Table of Contents

1. [Dependency Injection](#dependency-injection)
2. [Service Layer Pattern](#service-layer-pattern)
3. [Repository Pattern](#repository-pattern)
4. [DTO Pattern](#dto-pattern)
5. [Best Practices](#best-practices)
6. [Common Pitfalls](#common-pitfalls)

---

## Dependency Injection

### Constructor Injection with Lombok

**Always prefer constructor injection** over field injection for better testability and immutability.

```java
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor  // Generates constructor for final fields
@Slf4j
public class LinkService {
    private final RadioService radioService;
    private final RadioClient radioClient;
    private final LinkRepository linkRepository;

    public Link getLink(String radioId, String linkId) {
        log.info("Fetching link: {} from radio: {}", linkId, radioId);
        Radio radio = radioService.getRadio(radioId);
        return radio.getLinkById(linkId);
    }
}
```

### When to Use @AllArgsConstructor

Use `@AllArgsConstructor` when you have both final and non-final fields:

```java
@Service
@AllArgsConstructor
@Slf4j
public class CachingService {
    private final DataRepository repository;
    private CacheManager cacheManager;  // Non-final, can be updated

    public void updateCacheManager(CacheManager newManager) {
        this.cacheManager = newManager;
    }
}
```

### Manual Constructor (Edge Cases)

Only write manual constructors for complex initialization logic:

```java
@Service
@Slf4j
public class ComplexService {
    private final Repository repository;
    private final Client client;
    private final ExecutorService executor;

    public ComplexService(Repository repository, Client client) {
        this.repository = repository;
        this.client = client;
        // Custom initialization
        this.executor = Executors.newVirtualThreadPerTaskExecutor();
        log.info("Initialized ComplexService with virtual threads");
    }
}
```

---

## Service Layer Pattern

### Purpose

Services coordinate business logic between controllers, repositories, and external clients. They:
- Contain business logic and orchestration
- Coordinate between multiple repositories
- Handle domain-specific operations
- Throw domain-specific exceptions
- Log important operations

### Basic Service Structure

```java
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {
    private final RadioRepository radioRepository;
    private final RadioClient radioClient;

    public Radio getRadio(String radioId) {
        log.info("Fetching radio: {}", radioId);
        return radioRepository.findById(radioId)
            .orElseThrow(() -> new NoSuchElementException("Radio not found: " + radioId));
    }

    public Radio createRadio(CreateRadioCommand command) {
        log.info("Creating radio with name: {}", command.getName());

        // Validate business rules
        validateRadioName(command.getName());

        // Build domain model
        Radio radio = Radio.builder()
            .name(command.getName())
            .type(command.getType())
            .status(RadioStatus.INACTIVE)
            .build();

        // Save to repository
        Radio saved = radioRepository.save(radio);

        // Sync with external system
        radioClient.createRadio(saved);

        log.info("Created radio: {}", saved.getId());
        return saved;
    }

    private void validateRadioName(String name) {
        if (radioRepository.existsByName(name)) {
            throw new IllegalArgumentException("Radio name already exists: " + name);
        }
    }
}
```

### Service Coordination Pattern

Services can coordinate between multiple repositories and services:

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class LinkService {
    private final RadioService radioService;
    private final LinkRepository linkRepository;
    private final RadioClient radioClient;

    public Link getLink(String radioId, String linkId) {
        log.info("Fetching link: {} from radio: {}", linkId, radioId);

        // Use other service to get radio
        Radio radio = radioService.getRadio(radioId);

        // Get link from radio
        Link link = radio.getLinkById(linkId);

        return link;
    }

    public Link updateLink(String radioId, String linkId, UpdateLinkCommand command) {
        log.info("Updating link: {} in radio: {}", linkId, radioId);

        // Coordinate between multiple data sources
        Radio radio = radioService.getRadio(radioId);
        Link link = radio.getLinkById(linkId);

        // Apply updates
        link.setName(command.getName());
        link.setStatus(command.getStatus());

        // Save to repository
        linkRepository.save(link);

        // Sync with external system
        radioClient.updateLink(radioId, link);

        log.info("Updated link: {}", linkId);
        return link;
    }
}
```

### Transaction Management

Use `@Transactional` for database operations that require atomicity:

```java
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;

    @Transactional
    public Order createOrder(CreateOrderCommand command) {
        log.info("Creating order for user: {}", command.getUserId());

        // Create order
        Order order = orderRepository.save(Order.from(command));

        // Process payment (if this fails, order creation rolls back)
        paymentService.processPayment(order.getId(), command.getPaymentDetails());

        return order;
    }

    @Transactional(readOnly = true)
    public Order getOrder(String orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new NoSuchElementException("Order not found"));
    }
}
```

---

## Repository Pattern

### Purpose

Repositories abstract data access and provide a clean API for CRUD operations. They:
- Encapsulate data access logic
- Return domain models (not DTOs)
- Return `Optional<T>` for nullable results
- Return defensive copies for collections
- Use thread-safe collections for in-memory storage

### In-Memory Repository

```java
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
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
        // Return defensive copy
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

### Spring Data JPA Repository

For database-backed repositories, use Spring Data JPA:

```java
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RadioRepository extends JpaRepository<Radio, String> {

    Optional<Radio> findByName(String name);

    List<Radio> findByStatus(RadioStatus status);

    boolean existsByName(String name);

    @Query("SELECT r FROM Radio r WHERE r.type = :type AND r.status = :status")
    List<Radio> findByTypeAndStatus(RadioType type, RadioStatus status);
}
```

### Custom Repository Methods

Add custom methods to Spring Data repositories:

```java
@Repository
public interface RadioRepository extends JpaRepository<Radio, String>, RadioRepositoryCustom {
    // Standard methods...
}

public interface RadioRepositoryCustom {
    List<Radio> findRadiosWithComplexCriteria(RadioSearchCriteria criteria);
}

@RequiredArgsConstructor
public class RadioRepositoryCustomImpl implements RadioRepositoryCustom {
    private final EntityManager entityManager;

    @Override
    public List<Radio> findRadiosWithComplexCriteria(RadioSearchCriteria criteria) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Radio> query = cb.createQuery(Radio.class);
        Root<Radio> root = query.from(Radio.class);

        List<Predicate> predicates = new ArrayList<>();

        if (criteria.getName() != null) {
            predicates.add(cb.like(root.get("name"), "%" + criteria.getName() + "%"));
        }

        if (criteria.getStatus() != null) {
            predicates.add(cb.equal(root.get("status"), criteria.getStatus()));
        }

        query.where(predicates.toArray(new Predicate[0]));

        return entityManager.createQuery(query).getResultList();
    }
}
```

---

## DTO Pattern

### Purpose

DTOs (Data Transfer Objects) separate external representations from domain models:
- **GraphQL DTOs** (`*Gql`): For GraphQL API
- **REST DTOs** (`*Dto`): For REST API
- **Domain Models**: Internal business logic
- **External DTOs**: For third-party APIs

### DTO Layers

```
Client Request → GraphQL DTO → Domain Model → Repository
                    ↓
                 Mapper
                    ↓
              Domain Model
```

### GraphQL DTO Example

Use records for immutable DTOs:

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

### REST DTO Example

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

### Domain Model Example

Use Lombok's `@Data` and `@Builder` for domain models:

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

### Input Types for Mutations

```java
package com.company.project.dto.gql;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateLinkInput(
    @NotBlank(message = "Link ID is required")
    String linkId,

    @NotBlank(message = "Radio ID is required")
    String radioId,

    @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    String name,

    LinkStatusGql status
) {}
```

---

## Best Practices

### 1. Single Responsibility

Each service should have a single, well-defined responsibility:

```java
// GOOD: LinkService focuses only on link operations
@Service
@RequiredArgsConstructor
public class LinkService {
    private final RadioService radioService;
    private final LinkRepository linkRepository;

    public Link getLink(String radioId, String linkId) {
        Radio radio = radioService.getRadio(radioId);
        return radio.getLinkById(linkId);
    }
}

// BAD: Service doing too much
@Service
public class LinkService {
    // Managing links, radios, users, and sending emails!
    public Link getLink(String radioId, String linkId) { }
    public void sendLinkEmail(String linkId) { }
    public Radio getRadio(String radioId) { }
    public User getUser(String userId) { }
}
```

### 2. Defensive Copying

Always return defensive copies of mutable collections:

```java
@Repository
public class RadioRepository {
    private final Map<String, Radio> radios = new ConcurrentHashMap<>();

    // GOOD: Returns defensive copy
    public List<Radio> findAll() {
        return new ArrayList<>(radios.values());
    }

    // BAD: Exposes internal collection
    public Collection<Radio> findAll() {
        return radios.values();  // Caller can modify internal state!
    }
}
```

### 3. Validation in Services

Validate business rules in services, not repositories:

```java
@Service
@RequiredArgsConstructor
public class RadioService {
    private final RadioRepository radioRepository;

    public Radio createRadio(CreateRadioCommand command) {
        // Validate business rules
        if (radioRepository.existsByName(command.getName())) {
            throw new IllegalArgumentException("Radio name already exists");
        }

        if (command.getName().length() < 3) {
            throw new IllegalArgumentException("Radio name too short");
        }

        return radioRepository.save(Radio.from(command));
    }
}
```

### 4. Meaningful Exception Messages

Provide context in exception messages:

```java
// GOOD: Detailed message
public Radio getRadio(String radioId) {
    return radioRepository.findById(radioId)
        .orElseThrow(() -> new NoSuchElementException(
            "Radio not found with ID: " + radioId
        ));
}

// BAD: Generic message
public Radio getRadio(String radioId) {
    return radioRepository.findById(radioId)
        .orElseThrow(() -> new NoSuchElementException("Not found"));
}
```

### 5. Logging Strategy

Log at appropriate levels:

```java
@Service
@Slf4j
public class LinkService {

    public Link getLink(String radioId, String linkId) {
        log.info("Fetching link: {} from radio: {}", linkId, radioId);  // Info for important operations

        Link link = repository.findById(linkId)
            .orElseThrow(() -> {
                log.error("Link not found: {} in radio: {}", linkId, radioId);  // Error for failures
                return new NoSuchElementException("Link not found");
            });

        log.debug("Retrieved link details: {}", link);  // Debug for details
        return link;
    }
}
```

---

## Common Pitfalls

### 1. Field Injection

```java
// BAD: Field injection
@Service
public class LinkService {
    @Autowired
    private RadioService radioService;  // Hard to test, not immutable
}

// GOOD: Constructor injection
@Service
@RequiredArgsConstructor
public class LinkService {
    private final RadioService radioService;  // Easy to test, immutable
}
```

### 2. Logic in Controllers

```java
// BAD: Business logic in controller
@Controller
public class LinkController {
    @QueryMapping
    public LinkGql link(@Argument String radioId, @Argument String linkId) {
        Radio radio = radioRepository.findById(radioId).orElseThrow();
        Link link = radio.getLinkById(linkId);
        // Validation, mapping, business logic in controller!
        if (link.getName().isEmpty()) throw new IllegalArgumentException();
        return new LinkGql(link.getId(), link.getName());
    }
}

// GOOD: Delegate to service
@Controller
@RequiredArgsConstructor
public class LinkController {
    private final LinkService service;
    private final LinkMapper mapper;

    @QueryMapping
    public LinkGql link(@Argument String radioId, @Argument String linkId) {
        Link link = service.getLink(radioId, linkId);
        return mapper.toGql(link);
    }
}
```

### 3. Returning Mutable Internal State

```java
// BAD: Exposing internal state
@Data
public class Radio {
    private List<Link> links = new ArrayList<>();

    public List<Link> getLinks() {
        return links;  // Callers can modify internal list!
    }
}

// GOOD: Defensive copy
@Data
public class Radio {
    private List<Link> links = new ArrayList<>();

    public List<Link> getLinks() {
        return new ArrayList<>(links);  // Safe copy
    }
}
```

### 4. Missing Validation

```java
// BAD: No validation
@Service
public class RadioService {
    public Radio createRadio(CreateRadioCommand command) {
        return repository.save(Radio.from(command));  // What if name is null?
    }
}

// GOOD: Validate inputs
@Service
public class RadioService {
    public Radio createRadio(CreateRadioCommand command) {
        if (command.getName() == null || command.getName().isBlank()) {
            throw new IllegalArgumentException("Radio name is required");
        }
        return repository.save(Radio.from(command));
    }
}
```

### 5. Catching Generic Exceptions

```java
// BAD: Catching generic Exception
@Service
public class LinkService {
    public Link getLink(String linkId) {
        try {
            return repository.findById(linkId).orElseThrow();
        } catch (Exception e) {  // Too broad!
            log.error("Error", e);
            return null;
        }
    }
}

// GOOD: Catch specific exceptions
@Service
public class LinkService {
    public Link getLink(String linkId) {
        try {
            return repository.findById(linkId).orElseThrow();
        } catch (NoSuchElementException e) {
            log.error("Link not found: {}", linkId);
            throw new LinkNotFoundException("Link not found: " + linkId, e);
        }
    }
}
```

---

## Summary

Core patterns provide the foundation for clean, maintainable Spring Boot applications:

1. **Dependency Injection**: Constructor injection with `@RequiredArgsConstructor`
2. **Service Layer**: Business logic coordination and orchestration
3. **Repository Pattern**: Data access abstraction with clean APIs
4. **DTO Pattern**: Separation between layers (GraphQL, REST, domain, external)

Follow these patterns consistently for a well-structured, testable codebase.