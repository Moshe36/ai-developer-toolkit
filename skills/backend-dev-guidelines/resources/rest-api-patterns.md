# REST API Patterns

Comprehensive guide to implementing REST APIs with Spring Web, including controller patterns, ResponseEntity usage, HTTP status codes, and OpenAPI documentation.

---

## Table of Contents

1. [REST Controller Basics](#rest-controller-basics)
2. [HTTP Methods and Mappings](#http-methods-and-mappings)
3. [ResponseEntity Patterns](#responseentity-patterns)
4. [Request and Response DTOs](#request-and-response-dtos)
5. [HTTP Status Codes](#http-status-codes)
6. [OpenAPI Documentation](#openapi-documentation)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Common Pitfalls](#common-pitfalls)

---

## REST Controller Basics

### Basic Controller Structure

```java
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/radios")
@RequiredArgsConstructor
@Tag(name = "Radio Management", description = "APIs for managing radios")
public class RadioRestController {
    private final RadioService radioService;
    private final RadioMapper mapper;

    @GetMapping("/{radioId}")
    @Operation(summary = "Get radio by ID")
    public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
        Radio radio = radioService.getRadio(radioId);
        return ResponseEntity.ok(mapper.toDto(radio));
    }

    @PostMapping
    @Operation(summary = "Create new radio")
    public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
        Radio created = radioService.createRadio(mapper.toDomain(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toDto(created));
    }
}
```

### Key Annotations

- **`@RestController`**: Combines `@Controller` and `@ResponseBody`
- **`@RequestMapping`**: Base path for all endpoints in controller
- **`@GetMapping`**: HTTP GET requests
- **`@PostMapping`**: HTTP POST requests
- **`@PutMapping`**: HTTP PUT requests
- **`@DeleteMapping`**: HTTP DELETE requests
- **`@PatchMapping`**: HTTP PATCH requests
- **`@PathVariable`**: Binds URL path variable to parameter
- **`@RequestBody`**: Binds request body to parameter
- **`@RequestParam`**: Binds query parameter to parameter

---

## HTTP Methods and Mappings

### GET - Retrieve Resources

#### Get Single Resource

```java
@GetMapping("/{radioId}")
@Operation(summary = "Get radio by ID")
public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
    Radio radio = radioService.getRadio(radioId);
    return ResponseEntity.ok(mapper.toDto(radio));
}
```

**Request:**
```http
GET /api/v1/radios/radio-123
```

#### Get Collection

```java
@GetMapping
@Operation(summary = "Get all radios")
public ResponseEntity<List<RadioDto>> getAllRadios() {
    List<Radio> radios = radioService.getAllRadios();
    List<RadioDto> dtos = radios.stream()
        .map(mapper::toDto)
        .toList();
    return ResponseEntity.ok(dtos);
}
```

**Request:**
```http
GET /api/v1/radios
```

#### Get with Query Parameters

```java
@GetMapping
@Operation(summary = "Get radios by status")
public ResponseEntity<List<RadioDto>> getRadiosByStatus(
    @RequestParam(required = false) RadioStatus status,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    List<Radio> radios = radioService.getRadiosByStatus(status, page, size);
    List<RadioDto> dtos = radios.stream()
        .map(mapper::toDto)
        .toList();
    return ResponseEntity.ok(dtos);
}
```

**Request:**
```http
GET /api/v1/radios?status=ACTIVE&page=0&size=20
```

### POST - Create Resources

```java
@PostMapping
@Operation(summary = "Create new radio")
public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
    Radio created = radioService.createRadio(mapper.toDomain(request));
    RadioDto dto = mapper.toDto(created);

    // Return 201 Created with Location header
    return ResponseEntity
        .status(HttpStatus.CREATED)
        .header("Location", "/api/v1/radios/" + created.getId())
        .body(dto);
}
```

**Request:**
```http
POST /api/v1/radios
Content-Type: application/json

{
  "name": "Radio 1",
  "type": "TYPE_A"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Location: /api/v1/radios/radio-123
Content-Type: application/json

{
  "id": "radio-123",
  "name": "Radio 1",
  "type": "TYPE_A",
  "status": "INACTIVE"
}
```

### PUT - Update/Replace Resources

```java
@PutMapping("/{radioId}")
@Operation(summary = "Update radio")
public ResponseEntity<RadioDto> updateRadio(
    @PathVariable String radioId,
    @RequestBody @Valid UpdateRadioRequest request
) {
    Radio updated = radioService.updateRadio(radioId, mapper.toDomain(request));
    return ResponseEntity.ok(mapper.toDto(updated));
}
```

**Request:**
```http
PUT /api/v1/radios/radio-123
Content-Type: application/json

{
  "name": "Updated Radio",
  "type": "TYPE_B",
  "status": "ACTIVE"
}
```

### PATCH - Partial Update

```java
@PatchMapping("/{radioId}")
@Operation(summary = "Partially update radio")
public ResponseEntity<RadioDto> patchRadio(
    @PathVariable String radioId,
    @RequestBody PatchRadioRequest request
) {
    Radio patched = radioService.patchRadio(radioId, mapper.toDomain(request));
    return ResponseEntity.ok(mapper.toDto(patched));
}
```

**Request:**
```http
PATCH /api/v1/radios/radio-123
Content-Type: application/json

{
  "status": "ACTIVE"
}
```

### DELETE - Remove Resources

```java
@DeleteMapping("/{radioId}")
@Operation(summary = "Delete radio")
public ResponseEntity<Void> deleteRadio(@PathVariable String radioId) {
    radioService.deleteRadio(radioId);
    return ResponseEntity.noContent().build();
}
```

**Request:**
```http
DELETE /api/v1/radios/radio-123
```

**Response:**
```http
HTTP/1.1 204 No Content
```

---

## ResponseEntity Patterns

### Basic Response

```java
@GetMapping("/{radioId}")
public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
    Radio radio = radioService.getRadio(radioId);
    return ResponseEntity.ok(mapper.toDto(radio));
}
```

### Response with Custom Status

```java
@PostMapping
public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
    Radio created = radioService.createRadio(mapper.toDomain(request));
    return ResponseEntity
        .status(HttpStatus.CREATED)
        .body(mapper.toDto(created));
}
```

### Response with Headers

```java
@PostMapping
public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
    Radio created = radioService.createRadio(mapper.toDomain(request));
    return ResponseEntity
        .status(HttpStatus.CREATED)
        .header("Location", "/api/v1/radios/" + created.getId())
        .header("X-Resource-Id", created.getId())
        .body(mapper.toDto(created));
}
```

### No Content Response

```java
@DeleteMapping("/{radioId}")
public ResponseEntity<Void> deleteRadio(@PathVariable String radioId) {
    radioService.deleteRadio(radioId);
    return ResponseEntity.noContent().build();
}
```

### Conditional Response

```java
@GetMapping("/{radioId}")
public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
    Optional<Radio> radio = radioService.findRadio(radioId);

    return radio
        .map(r -> ResponseEntity.ok(mapper.toDto(r)))
        .orElse(ResponseEntity.notFound().build());
}
```

### Response with Pagination Headers

```java
@GetMapping
public ResponseEntity<List<RadioDto>> getRadios(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    Page<Radio> radiosPage = radioService.getRadios(page, size);

    List<RadioDto> dtos = radiosPage.getContent().stream()
        .map(mapper::toDto)
        .toList();

    return ResponseEntity.ok()
        .header("X-Total-Count", String.valueOf(radiosPage.getTotalElements()))
        .header("X-Page-Number", String.valueOf(radiosPage.getNumber()))
        .header("X-Page-Size", String.valueOf(radiosPage.getSize()))
        .body(dtos);
}
```

---

## Request and Response DTOs

### Request DTO

```java
package com.company.project.dto.json;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateRadioRequest {
    @NotBlank(message = "Name is required")
    @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    private String name;

    @NotBlank(message = "Type is required")
    @JsonProperty("radio_type")
    private String type;
}
```

### Response DTO

```java
package com.company.project.dto.json;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RadioDto {
    private String id;
    private String name;

    @JsonProperty("radio_type")
    private String type;

    @JsonProperty("radio_status")
    private String status;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}
```

### Update Request DTO

```java
@Data
public class UpdateRadioRequest {
    @Size(min = 3, max = 100)
    private String name;

    @JsonProperty("radio_type")
    private String type;

    @JsonProperty("radio_status")
    private String status;
}
```

### Patch Request DTO

```java
@Data
public class PatchRadioRequest {
    // All fields optional for PATCH
    @Size(min = 3, max = 100)
    private String name;

    @JsonProperty("radio_status")
    private String status;
}
```

### Nested DTOs

```java
@Data
public class RadioWithLinksDto {
    private String id;
    private String name;
    private String status;
    private List<LinkDto> links;
}

@Data
public class LinkDto {
    private String id;
    private String name;
    private String status;
}
```

---

## HTTP Status Codes

### Success Codes (2xx)

#### 200 OK - Successful GET, PUT, PATCH

```java
@GetMapping("/{radioId}")
public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
    Radio radio = radioService.getRadio(radioId);
    return ResponseEntity.ok(mapper.toDto(radio));  // 200 OK
}
```

#### 201 Created - Successful POST

```java
@PostMapping
public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
    Radio created = radioService.createRadio(mapper.toDomain(request));
    return ResponseEntity
        .status(HttpStatus.CREATED)  // 201 Created
        .body(mapper.toDto(created));
}
```

#### 204 No Content - Successful DELETE

```java
@DeleteMapping("/{radioId}")
public ResponseEntity<Void> deleteRadio(@PathVariable String radioId) {
    radioService.deleteRadio(radioId);
    return ResponseEntity.noContent().build();  // 204 No Content
}
```

### Client Error Codes (4xx)

#### 400 Bad Request - Validation Error

```java
@PostMapping
public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
    // If validation fails, Spring automatically returns 400
    Radio created = radioService.createRadio(mapper.toDomain(request));
    return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toDto(created));
}
```

#### 404 Not Found - Resource Not Found

Handled by exception handler:

```java
@ExceptionHandler(NoSuchElementException.class)
public ResponseEntity<ErrorResponse> handleNotFound(NoSuchElementException ex) {
    ErrorResponse error = new ErrorResponse(
        HttpStatus.NOT_FOUND.value(),
        ex.getMessage()
    );
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
}
```

#### 409 Conflict - Resource Conflict

```java
@PostMapping
public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
    if (radioService.existsByName(request.getName())) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.CONFLICT.value(),
            "Radio with name already exists"
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    Radio created = radioService.createRadio(mapper.toDomain(request));
    return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toDto(created));
}
```

### Server Error Codes (5xx)

#### 500 Internal Server Error

Handled by exception handler:

```java
@ExceptionHandler(Exception.class)
public ResponseEntity<ErrorResponse> handleGenericError(Exception ex) {
    log.error("Unexpected error", ex);
    ErrorResponse error = new ErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR.value(),
        "An unexpected error occurred"
    );
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
}
```

---

## OpenAPI Documentation

### Controller-Level Documentation

```java
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.Parameter;

@RestController
@RequestMapping("/api/v1/radios")
@RequiredArgsConstructor
@Tag(name = "Radio Management", description = "APIs for managing radios")
public class RadioRestController {
    private final RadioService radioService;
    private final RadioMapper mapper;

    @GetMapping("/{radioId}")
    @Operation(
        summary = "Get radio by ID",
        description = "Retrieves a radio by its unique identifier"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Radio found"),
        @ApiResponse(responseCode = "404", description = "Radio not found")
    })
    public ResponseEntity<RadioDto> getRadio(
        @Parameter(description = "Radio ID", required = true)
        @PathVariable String radioId
    ) {
        Radio radio = radioService.getRadio(radioId);
        return ResponseEntity.ok(mapper.toDto(radio));
    }
}
```

### Request Body Documentation

```java
@PostMapping
@Operation(
    summary = "Create new radio",
    description = "Creates a new radio with the provided details"
)
@ApiResponses(value = {
    @ApiResponse(responseCode = "201", description = "Radio created successfully"),
    @ApiResponse(responseCode = "400", description = "Invalid input")
})
public ResponseEntity<RadioDto> createRadio(
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        description = "Radio creation request",
        required = true
    )
    @RequestBody @Valid CreateRadioRequest request
) {
    Radio created = radioService.createRadio(mapper.toDomain(request));
    return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toDto(created));
}
```

### Schema Documentation

```java
import io.swagger.v3.oas.annotations.media.Schema;

@Data
@Schema(description = "Radio data transfer object")
public class RadioDto {
    @Schema(description = "Radio unique identifier", example = "radio-123")
    private String id;

    @Schema(description = "Radio name", example = "Main Radio")
    private String name;

    @Schema(description = "Radio type", example = "TYPE_A")
    @JsonProperty("radio_type")
    private String type;

    @Schema(description = "Radio status", example = "ACTIVE")
    @JsonProperty("radio_status")
    private String status;
}
```

### OpenAPI Configuration

```java
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Radio Management API")
                .version("1.0.0")
                .description("REST API for managing radios and links")
                .contact(new Contact()
                    .name("API Support")
                    .email("support@company.com")));
    }
}
```

---

## Error Handling

### Error Response DTO

```java
package com.company.project.dto.json;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ErrorResponse {
    private int status;
    private String message;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    public ErrorResponse(int status, String message) {
        this.status = status;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }
}
```

### Global Exception Handler

```java
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import lombok.extern.slf4j.Slf4j;
import java.util.HashMap;
import java.util.Map;

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

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NoSuchElementException ex) {
        log.error("Not found: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(IllegalArgumentException ex) {
        log.error("Bad request: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
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

---

## Best Practices

### 1. Use Proper HTTP Methods

```java
// GOOD: Correct HTTP methods
@GetMapping("/{id}")          // GET for retrieval
@PostMapping                  // POST for creation
@PutMapping("/{id}")          // PUT for full update
@PatchMapping("/{id}")        // PATCH for partial update
@DeleteMapping("/{id}")       // DELETE for removal

// BAD: Using GET for everything
@GetMapping("/createRadio")   // Should be POST
@GetMapping("/deleteRadio")   // Should be DELETE
```

### 2. Return ResponseEntity

```java
// GOOD: Return ResponseEntity with proper status
@PostMapping
public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
    Radio created = radioService.createRadio(mapper.toDomain(request));
    return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toDto(created));
}

// BAD: Return DTO directly (always 200 OK)
@PostMapping
public RadioDto createRadio(@RequestBody @Valid CreateRadioRequest request) {
    Radio created = radioService.createRadio(mapper.toDomain(request));
    return mapper.toDto(created);  // Always returns 200, should be 201
}
```

### 3. Use Path Variables for IDs

```java
// GOOD: ID in path
@GetMapping("/{radioId}")
public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
    // ...
}

// BAD: ID as query parameter
@GetMapping
public ResponseEntity<RadioDto> getRadio(@RequestParam String radioId) {
    // ...
}
```

### 4. Validate Request Bodies

```java
// GOOD: Validate with @Valid
@PostMapping
public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
    // Validation happens automatically
}

// Request DTO with validation
@Data
public class CreateRadioRequest {
    @NotBlank
    @Size(min = 3, max = 100)
    private String name;
}

// BAD: No validation
@PostMapping
public ResponseEntity<RadioDto> createRadio(@RequestBody CreateRadioRequest request) {
    // No validation - accepts invalid data
}
```

### 5. Version Your APIs

```java
// GOOD: Versioned API
@RestController
@RequestMapping("/api/v1/radios")
public class RadioRestController {
    // v1 endpoints
}

@RestController
@RequestMapping("/api/v2/radios")
public class RadioRestControllerV2 {
    // v2 endpoints with breaking changes
}

// BAD: No versioning
@RestController
@RequestMapping("/api/radios")
public class RadioRestController {
    // Breaking changes affect all clients
}
```

---

## Common Pitfalls

### 1. Using @Controller Instead of @RestController

```java
// BAD: Using @Controller
@Controller
@RequestMapping("/api/v1/radios")
public class RadioRestController {
    @GetMapping("/{radioId}")
    public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
        // Won't work without @ResponseBody
    }
}

// GOOD: Use @RestController
@RestController
@RequestMapping("/api/v1/radios")
public class RadioRestController {
    @GetMapping("/{radioId}")
    public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
        // Works correctly
    }
}
```

### 2. Missing @RequestBody

```java
// BAD: Missing @RequestBody
@PostMapping
public ResponseEntity<RadioDto> createRadio(CreateRadioRequest request) {
    // request will be null!
}

// GOOD: Use @RequestBody
@PostMapping
public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
    // request is properly bound
}
```

### 3. Wrong HTTP Status for Operations

```java
// BAD: Wrong status codes
@PostMapping
public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
    Radio created = radioService.createRadio(mapper.toDomain(request));
    return ResponseEntity.ok(mapper.toDto(created));  // Should be 201, not 200
}

@DeleteMapping("/{radioId}")
public ResponseEntity<String> deleteRadio(@PathVariable String radioId) {
    radioService.deleteRadio(radioId);
    return ResponseEntity.ok("Deleted");  // Should be 204, not 200
}

// GOOD: Correct status codes
@PostMapping
public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
    Radio created = radioService.createRadio(mapper.toDomain(request));
    return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toDto(created));  // 201
}

@DeleteMapping("/{radioId}")
public ResponseEntity<Void> deleteRadio(@PathVariable String radioId) {
    radioService.deleteRadio(radioId);
    return ResponseEntity.noContent().build();  // 204
}
```

### 4. Exposing Domain Models Directly

```java
// BAD: Return domain model
@GetMapping("/{radioId}")
public ResponseEntity<Radio> getRadio(@PathVariable String radioId) {
    Radio radio = radioService.getRadio(radioId);
    return ResponseEntity.ok(radio);  // Exposes internal structure
}

// GOOD: Return DTO
@GetMapping("/{radioId}")
public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
    Radio radio = radioService.getRadio(radioId);
    return ResponseEntity.ok(mapper.toDto(radio));  // Clean API contract
}
```

### 5. Not Using OpenAPI Documentation

```java
// BAD: No documentation
@GetMapping("/{radioId}")
public ResponseEntity<RadioDto> getRadio(@PathVariable String radioId) {
    // No documentation - unclear what this does
}

// GOOD: Add documentation
@GetMapping("/{radioId}")
@Operation(summary = "Get radio by ID", description = "Retrieves a radio by its unique identifier")
@ApiResponses(value = {
    @ApiResponse(responseCode = "200", description = "Radio found"),
    @ApiResponse(responseCode = "404", description = "Radio not found")
})
public ResponseEntity<RadioDto> getRadio(
    @Parameter(description = "Radio ID", required = true)
    @PathVariable String radioId
) {
    // Well documented
}
```

---

## Summary

REST API development with Spring Web follows these key patterns:

1. **Use `@RestController`** for REST endpoints
2. **Return `ResponseEntity<T>`** for flexible responses with proper status codes
3. **Use proper HTTP methods**: GET, POST, PUT, PATCH, DELETE
4. **Path variables for IDs**, query parameters for filters
5. **Validate with `@Valid`** on request bodies
6. **Use DTOs** - never expose domain models
7. **Proper HTTP status codes**: 200 OK, 201 Created, 204 No Content, 404 Not Found, etc.
8. **Document with OpenAPI**: `@Operation`, `@Tag`, `@ApiResponse`
9. **Global exception handling** with `@RestControllerAdvice`
10. **Version your APIs** with `/api/v1/`, `/api/v2/`

Follow these patterns for clean, well-documented REST APIs.