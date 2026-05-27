# Exception Handling

Comprehensive guide to exception handling in Spring Boot applications, including custom exceptions and global exception handlers for REST and GraphQL APIs.

---

## Table of Contents

1. [Exception Handling Strategy](#exception-handling-strategy)
2. [Custom Exceptions](#custom-exceptions)
3. [REST Exception Handling](#rest-exception-handling)
4. [GraphQL Exception Handling](#graphql-exception-handling)
5. [Validation Error Handling](#validation-error-handling)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)

---

## Exception Handling Strategy

### Exception Hierarchy

```
RuntimeException
├── IllegalArgumentException (Built-in)
├── NoSuchElementException (Built-in)
└── Custom Domain Exceptions
    ├── ResourceNotFoundException
    ├── ResourceAlreadyExistsException
    ├── InvalidOperationException
    └── ExternalServiceException
```

### When to Use Each Exception Type

```java
// IllegalArgumentException: Invalid input parameters
if (name == null || name.isBlank()) {
    throw new IllegalArgumentException("Name cannot be blank");
}

// NoSuchElementException: Resource not found
return repository.findById(id)
    .orElseThrow(() -> new NoSuchElementException("Radio not found: " + id));

// Custom exceptions: Domain-specific errors
if (radio.getStatus() == RadioStatus.ARCHIVED) {
    throw new InvalidOperationException("Cannot modify archived radio");
}
```

---

## Custom Exceptions

### Base Exception Class

```java
package com.company.project.infrastructure.exceptions;

public abstract class DomainException extends RuntimeException {

    public DomainException(String message) {
        super(message);
    }

    public DomainException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

### Resource Not Found Exception

```java
package com.company.project.infrastructure.exceptions;

public class ResourceNotFoundException extends DomainException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resourceType, String resourceId) {
        super(String.format("%s not found with ID: %s", resourceType, resourceId));
    }
}
```

**Usage:**
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {
    private final RadioRepository radioRepository;

    public Radio getRadio(String radioId) {
        return radioRepository.findById(radioId)
            .orElseThrow(() -> new ResourceNotFoundException("Radio", radioId));
    }
}
```

### Resource Already Exists Exception

```java
package com.company.project.infrastructure.exceptions;

public class ResourceAlreadyExistsException extends DomainException {

    public ResourceAlreadyExistsException(String message) {
        super(message);
    }

    public ResourceAlreadyExistsException(String resourceType, String field, String value) {
        super(String.format("%s already exists with %s: %s", resourceType, field, value));
    }
}
```

**Usage:**
```java
public Radio createRadio(CreateRadioCommand command) {
    if (radioRepository.existsByName(command.getName())) {
        throw new ResourceAlreadyExistsException("Radio", "name", command.getName());
    }

    Radio radio = Radio.builder()
        .name(command.getName())
        .build();

    return radioRepository.save(radio);
}
```

### Invalid Operation Exception

```java
package com.company.project.infrastructure.exceptions;

public class InvalidOperationException extends DomainException {

    public InvalidOperationException(String message) {
        super(message);
    }

    public InvalidOperationException(String operation, String reason) {
        super(String.format("Cannot %s: %s", operation, reason));
    }
}
```

**Usage:**
```java
public Link deleteLink(String radioId, String linkId) {
    Radio radio = getRadio(radioId);
    Link link = radio.getLinkById(linkId);

    if (link.getStatus() == LinkStatus.ACTIVE) {
        throw new InvalidOperationException(
            "delete active link",
            "Link must be deactivated first"
        );
    }

    radio.removeLink(linkId);
    return link;
}
```

### External Service Exception

```java
package com.company.project.infrastructure.exceptions;

public class ExternalServiceException extends DomainException {

    private final String serviceName;

    public ExternalServiceException(String serviceName, String message) {
        super(String.format("External service '%s' error: %s", serviceName, message));
        this.serviceName = serviceName;
    }

    public ExternalServiceException(String serviceName, String message, Throwable cause) {
        super(String.format("External service '%s' error: %s", serviceName, message), cause);
        this.serviceName = serviceName;
    }

    public String getServiceName() {
        return serviceName;
    }
}
```

**Usage:**
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioClient {
    private final WebClient webClient;

    public void syncRadio(Radio radio) {
        try {
            webClient.post()
                .uri("/radios")
                .bodyValue(radio)
                .retrieve()
                .bodyToMono(Void.class)
                .block();
        } catch (Exception e) {
            log.error("Failed to sync radio with external service", e);
            throw new ExternalServiceException("RadioAPI", "Failed to sync radio", e);
        }
    }
}
```

---

## REST Exception Handling

### Error Response DTO

```java
package com.company.project.dto.json;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@AllArgsConstructor
public class ErrorResponse {
    private int status;
    private String message;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    @JsonProperty("details")
    private Map<String, String> details;

    public ErrorResponse(int status, String message) {
        this.status = status;
        this.message = message;
        this.timestamp = LocalDateTime.now();
        this.details = null;
    }

    public ErrorResponse(int status, String message, Map<String, String> details) {
        this.status = status;
        this.message = message;
        this.timestamp = LocalDateTime.now();
        this.details = details;
    }
}
```

### Global REST Exception Handler

```java
package com.company.project.infrastructure.handlers;

import com.company.project.infrastructure.exceptions.*;
import com.company.project.dto.json.ErrorResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import lombok.extern.slf4j.Slf4j;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@RestControllerAdvice
@Slf4j
public class GlobalRestExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(
        MethodArgumentNotValidException ex
    ) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            errors.put(error.getField(), error.getDefaultMessage())
        );
        log.error("Validation error: {}", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        log.error("Resource not found: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ErrorResponse> handleNoSuchElement(NoSuchElementException ex) {
        log.error("Not found: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(ResourceAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleResourceAlreadyExists(
        ResourceAlreadyExistsException ex
    ) {
        log.error("Resource already exists: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
            HttpStatus.CONFLICT.value(),
            ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(InvalidOperationException.class)
    public ResponseEntity<ErrorResponse> handleInvalidOperation(InvalidOperationException ex) {
        log.error("Invalid operation: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        log.error("Bad request: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ExternalServiceException.class)
    public ResponseEntity<ErrorResponse> handleExternalService(ExternalServiceException ex) {
        log.error("External service error: {}", ex.getMessage(), ex);
        ErrorResponse error = new ErrorResponse(
            HttpStatus.BAD_GATEWAY.value(),
            "External service error: " + ex.getServiceName()
        );
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericError(Exception ex) {
        log.error("Unexpected error", ex);
        ErrorResponse error = new ErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "An unexpected error occurred"
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

### Example REST Error Responses

**Validation Error (400):**
```json
{
  "name": "must not be blank",
  "type": "must not be null"
}
```

**Not Found (404):**
```json
{
  "status": 404,
  "message": "Radio not found with ID: radio-123",
  "timestamp": "2025-12-01T10:30:00"
}
```

**Conflict (409):**
```json
{
  "status": 409,
  "message": "Radio already exists with name: Main Radio",
  "timestamp": "2025-12-01T10:30:00"
}
```

---

## GraphQL Exception Handling

### GraphQL Exception Handler

```java
package com.company.project.infrastructure.handlers;

import com.company.project.infrastructure.exceptions.*;
import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;
import java.util.NoSuchElementException;

@Component
@Slf4j
public class GraphQLExceptionHandler extends DataFetcherExceptionResolverAdapter {

    @Override
    protected GraphQLError resolveToSingleError(
        Throwable ex,
        DataFetchingEnvironment env
    ) {
        if (ex instanceof ResourceNotFoundException || ex instanceof NoSuchElementException) {
            log.error("Resource not found: {}", ex.getMessage());
            return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.NOT_FOUND)
                .message(ex.getMessage())
                .path(env.getExecutionStepInfo().getPath())
                .location(env.getField().getSourceLocation())
                .build();
        }

        if (ex instanceof ResourceAlreadyExistsException) {
            log.error("Resource already exists: {}", ex.getMessage());
            return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.BAD_REQUEST)
                .message(ex.getMessage())
                .path(env.getExecutionStepInfo().getPath())
                .location(env.getField().getSourceLocation())
                .build();
        }

        if (ex instanceof InvalidOperationException || ex instanceof IllegalArgumentException) {
            log.error("Invalid operation: {}", ex.getMessage());
            return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.BAD_REQUEST)
                .message(ex.getMessage())
                .path(env.getExecutionStepInfo().getPath())
                .location(env.getField().getSourceLocation())
                .build();
        }

        if (ex instanceof ExternalServiceException) {
            log.error("External service error: {}", ex.getMessage(), ex);
            return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.INTERNAL_ERROR)
                .message("External service unavailable")
                .path(env.getExecutionStepInfo().getPath())
                .location(env.getField().getSourceLocation())
                .build();
        }

        log.error("Unexpected error", ex);
        return GraphqlErrorBuilder.newError()
            .errorType(ErrorType.INTERNAL_ERROR)
            .message("Internal server error")
            .path(env.getExecutionStepInfo().getPath())
            .location(env.getField().getSourceLocation())
            .build();
    }
}
```

### Example GraphQL Error Responses

**Not Found:**
```json
{
  "errors": [
    {
      "message": "Radio not found with ID: radio-123",
      "locations": [{"line": 2, "column": 3}],
      "path": ["radio"],
      "extensions": {
        "classification": "NOT_FOUND"
      }
    }
  ],
  "data": {
    "radio": null
  }
}
```

**Invalid Operation:**
```json
{
  "errors": [
    {
      "message": "Cannot delete active link: Link must be deactivated first",
      "locations": [{"line": 2, "column": 3}],
      "path": ["deleteLink"],
      "extensions": {
        "classification": "BAD_REQUEST"
      }
    }
  ],
  "data": {
    "deleteLink": null
  }
}
```

---

## Validation Error Handling

### Jakarta Validation Annotations

```java
package com.company.project.dto.gql;

import jakarta.validation.constraints.*;

public record CreateRadioInput(
    @NotBlank(message = "Name is required")
    @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    String name,

    @NotNull(message = "Type is required")
    RadioTypeGql type,

    @Min(value = 1, message = "Max links must be at least 1")
    @Max(value = 100, message = "Max links cannot exceed 100")
    Integer maxLinks
) {}
```

### Validation in Controllers

```java
@Controller
@RequiredArgsConstructor
public class RadioController {
    private final RadioService radioService;

    @MutationMapping("createRadio")
    public RadioGql createRadio(@Argument("input") @Valid CreateRadioInput input) {
        // If validation fails, Spring GraphQL returns error automatically
        Radio created = radioService.createRadio(input);
        return mapper.toGql(created);
    }
}
```

### REST Validation Error Response

```json
{
  "name": "must not be blank",
  "maxLinks": "must be at least 1"
}
```

### GraphQL Validation Error Response

```json
{
  "errors": [
    {
      "message": "Validation error",
      "locations": [{"line": 2, "column": 3}],
      "path": ["createRadio"],
      "extensions": {
        "classification": "ValidationError",
        "name": "must not be blank",
        "maxLinks": "must be at least 1"
      }
    }
  ]
}
```

### Custom Validator

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

**Validator Implementation:**
```java
package com.company.project.infrastructure.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class RadioNameValidator implements ConstraintValidator<ValidRadioName, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return false;
        }

        // Custom validation logic
        if (value.contains("_")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                "Radio name cannot contain underscores"
            ).addConstraintViolation();
            return false;
        }

        return true;
    }
}
```

**Usage:**
```java
public record CreateRadioInput(
    @ValidRadioName
    String name,

    RadioTypeGql type
) {}
```

---

## Best Practices

### 1. Use Domain-Specific Exceptions

```java
// GOOD: Domain-specific exception
throw new ResourceNotFoundException("Radio", radioId);

// BAD: Generic exception
throw new RuntimeException("Radio not found: " + radioId);
```

### 2. Include Context in Exception Messages

```java
// GOOD: Detailed message
throw new InvalidOperationException(
    "delete active link",
    "Link must be deactivated before deletion. Link ID: " + linkId
);

// BAD: Vague message
throw new InvalidOperationException("Cannot delete");
```

### 3. Log at Appropriate Levels

```java
// Log errors with context
log.error("Failed to create radio: {}", command.getName(), ex);

// Log warnings for expected issues
log.warn("Radio name already exists: {}", command.getName());

// Log info for normal operations
log.info("Created radio: {}", created.getId());
```

### 4. Don't Expose Internal Details

```java
// GOOD: User-friendly message
throw new ExternalServiceException("RadioAPI", "Service temporarily unavailable");

// BAD: Exposing internals
throw new ExternalServiceException(
    "RadioAPI",
    "Connection to http://internal-server:8080/api failed with timeout"
);
```

### 5. Handle Exceptions at the Right Layer

```java
// GOOD: Service throws domain exception
@Service
public class RadioService {
    public Radio getRadio(String radioId) {
        return repository.findById(radioId)
            .orElseThrow(() -> new ResourceNotFoundException("Radio", radioId));
    }
}

// Global handler converts to response
@RestControllerAdvice
public class GlobalRestExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(...));
    }
}

// BAD: Service returns ResponseEntity
@Service
public class RadioService {
    public ResponseEntity<Radio> getRadio(String radioId) {
        // Service should not know about HTTP!
    }
}
```

### 6. Validate Early

```java
// GOOD: Validate at controller entry
@MutationMapping("createRadio")
public RadioGql createRadio(@Argument("input") @Valid CreateRadioInput input) {
    // Validation happens before service call
    Radio created = radioService.createRadio(input);
    return mapper.toGql(created);
}

// BAD: Validate deep in service
@Service
public class RadioService {
    public Radio createRadio(CreateRadioInput input) {
        if (input.getName() == null) {
            throw new IllegalArgumentException("Name required");
        }
        // Should be validated at entry point
    }
}
```

---

## Common Pitfalls

### 1. Catching Generic Exceptions

```java
// BAD: Catching Exception
try {
    return radioService.getRadio(radioId);
} catch (Exception e) {
    log.error("Error", e);
    return null;  // Lost important error information!
}

// GOOD: Catch specific exceptions or let handler deal with it
try {
    return radioService.getRadio(radioId);
} catch (ResourceNotFoundException e) {
    log.error("Radio not found: {}", radioId);
    throw e;  // Let global handler convert to response
}
```

### 2. Swallowing Exceptions

```java
// BAD: Swallowing exception
try {
    externalClient.sync(radio);
} catch (Exception e) {
    log.error("Failed to sync", e);
    // Continue as if nothing happened - data inconsistency!
}

// GOOD: Propagate exception
try {
    externalClient.sync(radio);
} catch (Exception e) {
    log.error("Failed to sync radio: {}", radio.getId(), e);
    throw new ExternalServiceException("RadioAPI", "Failed to sync", e);
}
```

### 3. Not Logging Exceptions

```java
// BAD: No logging
@ExceptionHandler(ResourceNotFoundException.class)
public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(...));
}

// GOOD: Log exceptions
@ExceptionHandler(ResourceNotFoundException.class)
public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
    log.error("Resource not found: {}", ex.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(...));
}
```

### 4. Returning null on Error

```java
// BAD: Return null
public Radio getRadio(String radioId) {
    Optional<Radio> radio = repository.findById(radioId);
    if (radio.isEmpty()) {
        return null;  // Caller has to check for null
    }
    return radio.get();
}

// GOOD: Throw exception
public Radio getRadio(String radioId) {
    return repository.findById(radioId)
        .orElseThrow(() -> new ResourceNotFoundException("Radio", radioId));
}
```

### 5. Not Using @RestControllerAdvice

```java
// BAD: Handling in each controller
@RestController
public class RadioController {
    @GetMapping("/{radioId}")
    public ResponseEntity<?> getRadio(@PathVariable String radioId) {
        try {
            Radio radio = service.getRadio(radioId);
            return ResponseEntity.ok(radio);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

// GOOD: Global exception handler
@RestControllerAdvice
public class GlobalRestExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        // Centralized error handling
    }
}

@RestController
public class RadioController {
    @GetMapping("/{radioId}")
    public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
        Radio radio = service.getRadio(radioId);  // Exceptions handled globally
        return ResponseEntity.ok(mapper.toDto(radio));
    }
}
```

---

## Summary

Exception handling in Spring Boot follows these key patterns:

1. **Domain-specific exceptions** for business logic errors
2. **`@RestControllerAdvice`** for global REST exception handling
3. **`DataFetcherExceptionResolverAdapter`** for GraphQL exceptions
4. **Validation with `@Valid`** and Jakarta Validation annotations
5. **Log exceptions** at appropriate levels with context
6. **Meaningful error messages** without exposing internals
7. **Proper HTTP status codes**: 400, 404, 409, 500, etc.
8. **Don't swallow exceptions** - propagate or handle appropriately
9. **Validate early** at controller entry points
10. **Handle exceptions at the right layer** - services throw, handlers convert

Follow these patterns for robust, maintainable error handling.