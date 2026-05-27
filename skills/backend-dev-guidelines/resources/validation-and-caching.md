# Validation and Caching

Comprehensive guide to input validation with Jakarta Validation and caching with Caffeine in Spring Boot applications.

---

## Table of Contents

1. [Jakarta Validation](#jakarta-validation)
2. [Custom Validators](#custom-validators)
3. [Caffeine Caching](#caffeine-caching)
4. [Cache Strategies](#cache-strategies)
5. [Best Practices](#best-practices)
6. [Common Pitfalls](#common-pitfalls)

---

## Jakarta Validation

### Common Validation Annotations

```java
package com.company.project.dto.gql;

import jakarta.validation.constraints.*;

public record CreateRadioInput(
    @NotNull(message = "Name cannot be null")
    @NotBlank(message = "Name cannot be blank")
    @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    String name,

    @NotNull(message = "Type is required")
    RadioTypeGql type,

    @Min(value = 1, message = "Max links must be at least 1")
    @Max(value = 100, message = "Max links cannot exceed 100")
    Integer maxLinks,

    @Email(message = "Invalid email format")
    String contactEmail,

    @Pattern(regexp = "^[A-Z]{2}\\d{3}$", message = "Code must be 2 letters followed by 3 digits")
    String code
) {}
```

### Validation Annotation Reference

| Annotation | Description | Example |
|------------|-------------|---------|
| `@NotNull` | Value cannot be null | `@NotNull String name` |
| `@NotBlank` | String cannot be null, empty, or whitespace | `@NotBlank String name` |
| `@NotEmpty` | Collection/array cannot be null or empty | `@NotEmpty List<String> items` |
| `@Size` | String/Collection size constraints | `@Size(min=3, max=100) String name` |
| `@Min` | Number minimum value | `@Min(1) int count` |
| `@Max` | Number maximum value | `@Max(100) int count` |
| `@Email` | Valid email format | `@Email String email` |
| `@Pattern` | Matches regex pattern | `@Pattern(regexp="^[A-Z]+$") String code` |
| `@Positive` | Number must be positive | `@Positive int amount` |
| `@PositiveOrZero` | Number must be positive or zero | `@PositiveOrZero int count` |
| `@Negative` | Number must be negative | `@Negative int debt` |
| `@Past` | Date must be in the past | `@Past LocalDate birthDate` |
| `@Future` | Date must be in the future | `@Future LocalDate eventDate` |
| `@Valid` | Validate nested object | `@Valid Address address` |

### Nested Object Validation

```java
public record CreateRadioWithLinksInput(
    @NotBlank
    @Size(min = 3, max = 100)
    String name,

    @NotNull
    RadioTypeGql type,

    @Valid  // Validate nested objects
    @NotEmpty
    List<CreateLinkInput> links
) {}

public record CreateLinkInput(
    @NotBlank
    @Size(min = 3, max = 50)
    String name,

    @Size(max = 500)
    String description
) {}
```

### Validation in Controllers

#### GraphQL Controller

```java
@Controller
@RequiredArgsConstructor
public class RadioController {
    private final RadioService radioService;
    private final FrontendMapper mapper;

    @MutationMapping("createRadio")
    public RadioGql createRadio(@Argument("input") @Valid CreateRadioInput input) {
        // Validation happens automatically before method execution
        Radio created = radioService.createRadio(mapper.toDomain(input));
        return mapper.toGql(created);
    }
}
```

#### REST Controller

```java
@RestController
@RequestMapping("/api/v1/radios")
@RequiredArgsConstructor
public class RadioRestController {
    private final RadioService radioService;
    private final RadioMapper mapper;

    @PostMapping
    public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
        // Validation happens automatically
        Radio created = radioService.createRadio(mapper.toDomain(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toDto(created));
    }
}
```

### Validation Groups

```java
public interface CreateValidation {}
public interface UpdateValidation {}

public record RadioInput(
    @Null(groups = CreateValidation.class)  // Must be null for create
    @NotNull(groups = UpdateValidation.class)  // Required for update
    String id,

    @NotBlank(groups = {CreateValidation.class, UpdateValidation.class})
    String name,

    @NotNull(groups = CreateValidation.class)  // Required for create
    RadioTypeGql type
) {}

// Usage
@MutationMapping("createRadio")
public RadioGql createRadio(
    @Argument("input") @Validated(CreateValidation.class) RadioInput input
) {
    // Validates with CreateValidation rules
}

@MutationMapping("updateRadio")
public RadioGql updateRadio(
    @Argument("input") @Validated(UpdateValidation.class) RadioInput input
) {
    // Validates with UpdateValidation rules
}
```

### Method-Level Validation

```java
@Service
@Validated  // Enable method-level validation
@RequiredArgsConstructor
@Slf4j
public class RadioService {

    public Radio createRadio(
        @NotNull @Valid CreateRadioCommand command
    ) {
        log.info("Creating radio: {}", command.getName());
        // Method parameter validated automatically
        return repository.save(Radio.from(command));
    }

    @Min(1)
    public int countActiveRadios() {
        // Return value validated automatically
        return repository.countByStatus(RadioStatus.ACTIVE);
    }
}
```

---

## Custom Validators

### Custom Annotation

```java
package com.company.project.infrastructure.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = RadioNameValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidRadioName {
    String message() default "Invalid radio name";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

### Validator Implementation

```java
package com.company.project.infrastructure.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class RadioNameValidator implements ConstraintValidator<ValidRadioName, String> {

    @Override
    public void initialize(ValidRadioName constraintAnnotation) {
        // Initialization logic if needed
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return false;
        }

        // Custom validation rules
        if (value.contains("_")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                "Radio name cannot contain underscores"
            ).addConstraintViolation();
            return false;
        }

        if (value.startsWith(" ") || value.endsWith(" ")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                "Radio name cannot have leading or trailing spaces"
            ).addConstraintViolation();
            return false;
        }

        if (!value.matches("^[a-zA-Z0-9 -]+$")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                "Radio name can only contain letters, numbers, spaces, and hyphens"
            ).addConstraintViolation();
            return false;
        }

        return true;
    }
}
```

### Using Custom Validator

```java
public record CreateRadioInput(
    @ValidRadioName
    String name,

    @NotNull
    RadioTypeGql type
) {}
```

### Cross-Field Validation

```java
@Constraint(validatedBy = DateRangeValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidDateRange {
    String message() default "End date must be after start date";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class DateRangeValidator implements ConstraintValidator<ValidDateRange, DateRangeInput> {

    @Override
    public boolean isValid(DateRangeInput value, ConstraintValidatorContext context) {
        if (value == null || value.startDate() == null || value.endDate() == null) {
            return true;  // Let @NotNull handle null checks
        }

        if (value.endDate().isBefore(value.startDate())) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                "End date must be after start date"
            ).addConstraintViolation();
            return false;
        }

        return true;
    }
}

@ValidDateRange
public record DateRangeInput(
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate
) {}
```

---

## Caffeine Caching

### Cache Configuration

```java
package com.company.project.infrastructure.beans;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfiguration {

    @Bean
    public CacheManager cacheManager(AppConfigs appConfigs) {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("radios", "links", "users");

        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(appConfigs.cacheSize())
            .expireAfterWrite(appConfigs.cacheTtlMinutes(), TimeUnit.MINUTES)
            .recordStats());

        return cacheManager;
    }
}
```

### @Cacheable - Cache Results

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {
    private final RadioRepository radioRepository;

    @Cacheable(value = "radios", key = "#radioId")
    public Radio getRadio(String radioId) {
        log.info("Fetching radio from repository: {}", radioId);
        return radioRepository.findById(radioId)
            .orElseThrow(() -> new ResourceNotFoundException("Radio", radioId));
    }

    @Cacheable(value = "radios", key = "'all'")
    public List<Radio> getAllRadios() {
        log.info("Fetching all radios from repository");
        return radioRepository.findAll();
    }
}
```

### @CacheEvict - Invalidate Cache

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {
    private final RadioRepository radioRepository;

    @CacheEvict(value = "radios", key = "#radioId")
    public void deleteRadio(String radioId) {
        log.info("Deleting radio: {}", radioId);
        radioRepository.deleteById(radioId);
        // Cache entry removed automatically
    }

    @CacheEvict(value = "radios", allEntries = true)
    public void clearAllRadios() {
        log.info("Clearing all radios from cache");
        // All cache entries removed
    }
}
```

### @CachePut - Update Cache

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {
    private final RadioRepository radioRepository;

    @CachePut(value = "radios", key = "#result.id")
    public Radio updateRadio(String radioId, UpdateRadioCommand command) {
        log.info("Updating radio: {}", radioId);
        Radio radio = getRadio(radioId);
        radio.setName(command.getName());
        radio.setStatus(command.getStatus());
        Radio updated = radioRepository.save(radio);
        // Cache updated with new value
        return updated;
    }
}
```

### Multiple Cache Operations

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {

    @Caching(
        evict = {
            @CacheEvict(value = "radios", key = "#radioId"),
            @CacheEvict(value = "links", allEntries = true)
        }
    )
    public void deleteRadioWithLinks(String radioId) {
        log.info("Deleting radio and all links: {}", radioId);
        radioRepository.deleteById(radioId);
    }
}
```

### Conditional Caching

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {

    // Only cache if result is not null
    @Cacheable(value = "radios", key = "#radioId", unless = "#result == null")
    public Radio findRadio(String radioId) {
        return radioRepository.findById(radioId).orElse(null);
    }

    // Only cache active radios
    @Cacheable(value = "radios", key = "#radioId", condition = "#result.status == T(com.company.project.enums.RadioStatus).ACTIVE")
    public Radio getRadio(String radioId) {
        return radioRepository.findById(radioId).orElseThrow();
    }
}
```

### Custom Cache Key

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class LinkService {

    // Custom cache key combining multiple parameters
    @Cacheable(value = "links", key = "#radioId + '-' + #linkId")
    public Link getLink(String radioId, String linkId) {
        log.info("Fetching link: {} from radio: {}", linkId, radioId);
        return linkRepository.findByRadioIdAndLinkId(radioId, linkId)
            .orElseThrow(() -> new ResourceNotFoundException("Link", linkId));
    }

    // Using SpEL for complex keys
    @Cacheable(value = "links", key = "T(String).format('%s-%s', #radioId, #status.name())")
    public List<Link> getLinksByStatus(String radioId, LinkStatus status) {
        return linkRepository.findByRadioIdAndStatus(radioId, status);
    }
}
```

---

## Cache Strategies

### Cache-Aside Pattern

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {
    private final RadioRepository radioRepository;
    private final CacheManager cacheManager;

    public Radio getRadio(String radioId) {
        // Check cache first
        Cache cache = cacheManager.getCache("radios");
        if (cache != null) {
            Radio cached = cache.get(radioId, Radio.class);
            if (cached != null) {
                log.info("Cache hit for radio: {}", radioId);
                return cached;
            }
        }

        // Cache miss - fetch from repository
        log.info("Cache miss for radio: {}", radioId);
        Radio radio = radioRepository.findById(radioId)
            .orElseThrow(() -> new ResourceNotFoundException("Radio", radioId));

        // Update cache
        if (cache != null) {
            cache.put(radioId, radio);
        }

        return radio;
    }
}
```

### Write-Through Pattern

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {

    @CachePut(value = "radios", key = "#result.id")
    @Transactional
    public Radio createRadio(CreateRadioCommand command) {
        log.info("Creating radio: {}", command.getName());
        Radio radio = Radio.from(command);
        Radio saved = radioRepository.save(radio);
        // Cache updated automatically after save
        return saved;
    }
}
```

### Cache Warming

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class CacheWarmer {
    private final RadioService radioService;
    private final RadioRepository radioRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void warmCache() {
        log.info("Warming cache with active radios");
        List<Radio> activeRadios = radioRepository.findByStatus(RadioStatus.ACTIVE);

        for (Radio radio : activeRadios) {
            radioService.getRadio(radio.getId());  // Triggers @Cacheable
        }

        log.info("Cache warmed with {} radios", activeRadios.size());
    }
}
```

### Cache Statistics

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class CacheMonitoringService {
    private final CacheManager cacheManager;

    @Scheduled(fixedRate = 60000)  // Every minute
    public void logCacheStats() {
        Collection<String> cacheNames = cacheManager.getCacheNames();

        for (String cacheName : cacheNames) {
            Cache cache = cacheManager.getCache(cacheName);
            if (cache instanceof CaffeineCache caffeineCache) {
                com.github.benmanes.caffeine.cache.Cache<Object, Object> nativeCache =
                    caffeineCache.getNativeCache();

                CacheStats stats = nativeCache.stats();
                log.info("Cache '{}' stats: hits={}, misses={}, hitRate={}",
                    cacheName,
                    stats.hitCount(),
                    stats.missCount(),
                    stats.hitRate());
            }
        }
    }
}
```

---

## Best Practices

### 1. Always Use @Valid for Input Validation

```java
// GOOD: Validate input
@MutationMapping("createRadio")
public RadioGql createRadio(@Argument("input") @Valid CreateRadioInput input) {
    // Input validated automatically
}

// BAD: No validation
@MutationMapping("createRadio")
public RadioGql createRadio(@Argument("input") CreateRadioInput input) {
    // Invalid data can reach service layer
}
```

### 2. Use Appropriate Cache Keys

```java
// GOOD: Specific cache key
@Cacheable(value = "links", key = "#radioId + '-' + #linkId")
public Link getLink(String radioId, String linkId) {
    // Unique key per link
}

// BAD: Generic cache key
@Cacheable(value = "links", key = "'link'")
public Link getLink(String radioId, String linkId) {
    // All links share same cache entry!
}
```

### 3. Clear Cache on Updates

```java
// GOOD: Clear cache on update
@CacheEvict(value = "radios", key = "#radioId")
public void deleteRadio(String radioId) {
    radioRepository.deleteById(radioId);
}

// BAD: Cache not cleared
public void deleteRadio(String radioId) {
    radioRepository.deleteById(radioId);
    // Stale data remains in cache!
}
```

### 4. Use Custom Messages

```java
// GOOD: Custom messages
public record CreateRadioInput(
    @NotBlank(message = "Radio name is required")
    @Size(min = 3, max = 100, message = "Radio name must be between 3 and 100 characters")
    String name
) {}

// BAD: Default messages
public record CreateRadioInput(
    @NotBlank
    @Size(min = 3, max = 100)
    String name
) {}
```

### 5. Validate Nested Objects

```java
// GOOD: Validate nested objects
public record CreateRadioWithLinksInput(
    @NotBlank String name,
    @Valid @NotEmpty List<CreateLinkInput> links
) {}

// BAD: No validation on nested objects
public record CreateRadioWithLinksInput(
    @NotBlank String name,
    List<CreateLinkInput> links  // Links not validated!
) {}
```

---

## Common Pitfalls

### 1. Missing @EnableCaching

```java
// BAD: Caching not enabled
@Configuration
public class CacheConfiguration {
    @Bean
    public CacheManager cacheManager() {
        // Cache manager defined but caching not enabled
        return new CaffeineCacheManager();
    }
}

// GOOD: Enable caching
@Configuration
@EnableCaching
public class CacheConfiguration {
    @Bean
    public CacheManager cacheManager() {
        return new CaffeineCacheManager();
    }
}
```

### 2. Caching Mutable Objects

```java
// BAD: Caching mutable object
@Cacheable("radios")
public Radio getRadio(String radioId) {
    return radioRepository.findById(radioId).orElseThrow();
}

// Caller can modify cached object!
Radio radio = service.getRadio("123");
radio.setName("Modified");  // Modifies cached instance!

// GOOD: Return defensive copy
@Cacheable("radios")
public Radio getRadio(String radioId) {
    Radio radio = radioRepository.findById(radioId).orElseThrow();
    return Radio.builder()
        .id(radio.getId())
        .name(radio.getName())
        .status(radio.getStatus())
        .build();  // Return copy
}
```

### 3. Not Clearing Cache on Updates

```java
// BAD: Cache not cleared
public Radio updateRadio(String radioId, UpdateRadioCommand command) {
    Radio radio = getRadio(radioId);  // Gets from cache
    radio.setName(command.getName());
    return radioRepository.save(radio);
    // Cache still has old data!
}

// GOOD: Clear or update cache
@CachePut(value = "radios", key = "#radioId")
public Radio updateRadio(String radioId, UpdateRadioCommand command) {
    Radio radio = getRadio(radioId);
    radio.setName(command.getName());
    return radioRepository.save(radio);
    // Cache updated with new data
}
```

### 4. Caching Methods with Side Effects

```java
// BAD: Caching method with side effects
@Cacheable("radios")
public Radio getRadio(String radioId) {
    Radio radio = radioRepository.findById(radioId).orElseThrow();
    // Side effect: logging, metrics, external calls
    externalClient.notifyAccess(radioId);
    return radio;
}
// Side effect only happens on cache miss!

// GOOD: Separate concerns
@Cacheable("radios")
public Radio getRadio(String radioId) {
    return radioRepository.findById(radioId).orElseThrow();
}

public Radio getRadioWithNotification(String radioId) {
    Radio radio = getRadio(radioId);  // Cached
    externalClient.notifyAccess(radioId);  // Always happens
    return radio;
}
```

### 5. Missing @Validated on Service

```java
// BAD: Method-level validation doesn't work
@Service
public class RadioService {
    public Radio createRadio(@NotNull @Valid CreateRadioCommand command) {
        // Validation not applied!
    }
}

// GOOD: Enable validation with @Validated
@Service
@Validated
public class RadioService {
    public Radio createRadio(@NotNull @Valid CreateRadioCommand command) {
        // Validation applied automatically
    }
}
```

---

## Summary

Validation and caching in Spring Boot follow these key patterns:

### Validation:
1. **Jakarta Validation annotations** (`@NotNull`, `@NotBlank`, `@Size`, etc.)
2. **`@Valid` on controller parameters** for automatic validation
3. **Custom validators** for complex validation rules
4. **Method-level validation** with `@Validated` on service classes
5. **Validation groups** for different validation scenarios
6. **Custom error messages** for better user experience

### Caching:
1. **`@EnableCaching`** to enable caching support
2. **`@Cacheable`** to cache method results
3. **`@CacheEvict`** to remove cache entries
4. **`@CachePut`** to update cache
5. **Caffeine for cache implementation** (high performance)
6. **Appropriate cache keys** for unique identification
7. **Clear cache on updates** to avoid stale data
8. **Monitor cache statistics** for optimization

Follow these patterns for robust input validation and efficient caching.