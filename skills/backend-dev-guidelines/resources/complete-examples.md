# Complete Examples

Full working templates for common backend patterns.

---

## GraphQL Controller Template

```java
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class ResourceController {
    private final ResourceService service;
    private final ResourceMapper mapper;

    @QueryMapping("resource")
    public ResourceGql getResource(@Argument("id") @NotBlank String id) {
        Resource resource = service.getResource(id);
        return mapper.toGql(resource);
    }

    @MutationMapping("updateResource")
    public ResourceGql updateResource(@Argument("input") @Valid UpdateResourceInput input) {
        Resource updated = service.updateResource(mapper.toDomain(input));
        return mapper.toGql(updated);
    }
}
```

---

## REST Controller Template

```java
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

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
        Radio radio = radioService.getRadio(radioId);
        return ResponseEntity.ok(mapper.toDto(radio));
    }

    @PostMapping
    @Operation(summary = "Create new radio")
    public ResponseEntity<RadioDto> createRadio(@RequestBody @Valid CreateRadioRequest request) {
        Radio created = radioService.createRadio(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.toDto(created));
    }
}
```

---

## Service Template

```java
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceService {
    private final ResourceRepository repository;
    private final ExternalClient client;

    public Resource getResource(String id) {
        log.info("Fetching resource: {}", id);
        return repository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Resource not found: " + id));
    }

    public Resource updateResource(UpdateResourceCommand command) {
        log.info("Updating resource: {}", command.getId());
        Resource resource = getResource(command.getId());
        client.updateExternal(command);
        repository.save(resource);
        return resource;
    }
}
```

---

## MapStruct Mapper Template

```java
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface FrontendMapper {
    LinkGql toGql(Link link);

    @Mapping(source = "linkId", target = "id")
    Link toDomain(UpdateLinkInput input);

    List<LinkGql> toGqlList(List<Link> links);
}
```

---

## DTO Examples

### GraphQL DTO (Record)
```java
public record LinkGql(
    String id,
    String name,
    LinkStatusGql status,
    Integer txPower,
    Integer rxPower
) {}
```

### Input Type
```java
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

public record UpdateLinkInput(
    @NotBlank(message = "Link ID is required")
    String linkId,

    @NotBlank(message = "Name is required")
    String name,

    @Min(value = 0, message = "TX power must be >= 0")
    @Max(value = 30, message = "TX power must be <= 30")
    Integer txPower
) {}
```

### Domain Model
```java
import lombok.Data;
import lombok.Builder;

@Data
@Builder
public class Link {
    private String id;
    private String name;
    private LinkStatus status;
    private Integer txPower;
    private Integer rxPower;
}
```

---

## Exception Handler Template

```java
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import lombok.extern.slf4j.Slf4j;
import java.util.Map;
import java.util.HashMap;

@ControllerAdvice
@Slf4j
public class GlobalRestExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(
        MethodArgumentNotValidException ex
    ) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(error -> errors.put(
                error.getField(),
                error.getDefaultMessage()
            ));
        log.error("Validation error: {}", errors);
        return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(
        NoSuchElementException ex
    ) {
        Map<String, String> error = Map.of("error", ex.getMessage());
        log.error("Not found: {}", ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }
}
```

---

## Configuration Template

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import jakarta.annotation.PostConstruct;

@ConfigurationProperties(prefix = "app.configs")
@Validated
@Slf4j
public record AppConfigs(
    @JsonProperty("http-timeout-ms")
    int httpTimeoutMs,

    @JsonProperty("cache-size")
    int cacheSize,

    @JsonProperty("max-retries")
    int maxRetries
) {
    public AppConfigs {
        // Compact constructor for validation
        if (httpTimeoutMs < 0) {
            throw new IllegalArgumentException("Timeout must be positive");
        }
    }

    @PostConstruct
    public void init() {
        log.info("Loaded configuration: {}", this);
    }
}
```

---

## Project Structure Example

```
com.company.project.backend/
├── controllers/
│   └── frontend/
│       ├── LinkController.java
│       └── RadioController.java
├── services/
│   ├── LinkService.java
│   └── RadioService.java
├── repositories/
│   ├── LinkRepository.java
│   └── RadioRepository.java
├── models/
│   ├── Link.java
│   └── Radio.java
├── dto/
│   ├── gql/
│   │   ├── LinkGql.java
│   │   └── UpdateLinkInput.java
│   └── json/
│       └── RadioDto.java
├── mappers/
│   ├── FrontendMapper.java
│   └── RadioMapper.java
├── infrastructure/
│   ├── beans/
│   │   └── CacheConfig.java
│   ├── exceptions/
│   │   ├── GlobalRestExceptionHandler.java
│   │   └── GraphQLExceptionHandler.java
│   └── handlers/
└── constants/
    └── AppConstants.java
```
