# Configuration Management

Comprehensive guide to application configuration in Spring Boot using records, @ConfigurationProperties, bean definitions, and profiles.

---

## Table of Contents

1. [Configuration with Records](#configuration-with-records)
2. [Bean Configuration](#bean-configuration)
3. [Profile-Specific Configuration](#profile-specific-configuration)
4. [Virtual Threads Configuration](#virtual-threads-configuration)
5. [External Client Configuration](#external-client-configuration)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)

---

## Configuration with Records

### Basic Configuration Record

```java
package com.company.project.infrastructure.beans;

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
    int cacheSize,

    @JsonProperty("max-retries")
    @DefaultValue("3")
    int maxRetries
) {
    @PostConstruct
    public void init() {
        log.info("Loaded application configuration: {}", this);
    }
}
```

**application.yml:**
```yaml
app:
  configs:
    http-timeout-ms: 5000
    cache-size: 1000
    max-retries: 3
```

### Enable Configuration Properties

```java
package com.company.project;

import com.company.project.infrastructure.beans.AppConfigs;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppConfigs.class)
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

### Using Configuration in Services

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioClient {
    private final AppConfigs appConfigs;
    private final WebClient webClient;

    public void syncRadio(Radio radio) {
        log.info("Syncing radio with timeout: {}ms", appConfigs.httpTimeoutMs());

        webClient.post()
            .uri("/radios")
            .bodyValue(radio)
            .retrieve()
            .bodyToMono(Void.class)
            .timeout(Duration.ofMillis(appConfigs.httpTimeoutMs()))
            .block();
    }
}
```

### Nested Configuration

```java
@ConfigurationProperties(prefix = "app")
@Validated
public record AppConfiguration(
    Server server,
    Cache cache,
    External external
) {
    public record Server(
        @DefaultValue("8080")
        int port,

        @DefaultValue("true")
        boolean enableVirtualThreads
    ) {}

    public record Cache(
        @DefaultValue("1000")
        int maxSize,

        @DefaultValue("60")
        int ttlMinutes
    ) {}

    public record External(
        @DefaultValue("http://localhost:8081")
        String baseUrl,

        @DefaultValue("5000")
        int timeoutMs
    ) {}
}
```

**application.yml:**
```yaml
app:
  server:
    port: 8080
    enable-virtual-threads: true
  cache:
    max-size: 1000
    ttl-minutes: 60
  external:
    base-url: http://localhost:8081
    timeout-ms: 5000
```

### Configuration with Validation

```java
@ConfigurationProperties(prefix = "app.radio")
@Validated
public record RadioConfiguration(
    @NotBlank(message = "API URL is required")
    String apiUrl,

    @Min(value = 1000, message = "Timeout must be at least 1000ms")
    @Max(value = 60000, message = "Timeout cannot exceed 60000ms")
    int timeoutMs,

    @Size(min = 1, message = "At least one allowed status required")
    List<String> allowedStatuses
) {
    @PostConstruct
    public void init() {
        log.info("Radio configuration loaded: {}", this);
    }
}
```

---

## Bean Configuration

### Configuration Class

```java
package com.company.project.infrastructure.beans;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class ApplicationConfiguration {

    @Bean
    public WebClient webClient(AppConfigs appConfigs) {
        return WebClient.builder()
            .baseUrl(appConfigs.apiBaseUrl())
            .defaultHeader("Content-Type", "application/json")
            .build();
    }

    @Bean
    public CacheManager cacheManager(AppConfigs appConfigs) {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("radios", "links");
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(appConfigs.cacheSize())
            .expireAfterWrite(appConfigs.cacheTtlMinutes(), TimeUnit.MINUTES)
            .recordStats());
        return cacheManager;
    }
}
```

### Conditional Bean Configuration

```java
@Configuration
public class ExternalClientConfiguration {

    @Bean
    @ConditionalOnProperty(name = "app.external.enabled", havingValue = "true")
    public ExternalRadioClient externalRadioClient(AppConfigs appConfigs) {
        return new ExternalRadioClient(appConfigs);
    }

    @Bean
    @ConditionalOnMissingBean(ExternalRadioClient.class)
    public ExternalRadioClient mockExternalRadioClient() {
        return new MockExternalRadioClient();
    }
}
```

### Profile-Specific Beans

```java
@Configuration
public class DataSourceConfiguration {

    @Bean
    @Profile("dev")
    public DataSource devDataSource() {
        return DataSourceBuilder.create()
            .url("jdbc:h2:mem:testdb")
            .username("sa")
            .password("")
            .build();
    }

    @Bean
    @Profile("prod")
    public DataSource prodDataSource(DatabaseConfiguration dbConfig) {
        return DataSourceBuilder.create()
            .url(dbConfig.url())
            .username(dbConfig.username())
            .password(dbConfig.password())
            .build();
    }
}
```

---

## Profile-Specific Configuration

### Application Profiles

**application.yml** (base configuration):
```yaml
spring:
  application:
    name: radio-backend

app:
  configs:
    http-timeout-ms: 5000
    cache-size: 1000

logging:
  level:
    root: INFO
```

**application-dev.yml** (development profile):
```yaml
spring:
  h2:
    console:
      enabled: true

app:
  configs:
    http-timeout-ms: 10000
    cache-size: 100

logging:
  level:
    root: DEBUG
    com.company.project: DEBUG
```

**application-prod.yml** (production profile):
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/radiodb
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

app:
  configs:
    http-timeout-ms: 3000
    cache-size: 10000

logging:
  level:
    root: WARN
    com.company.project: INFO
```

### Activating Profiles

**Command line:**
```bash
java -jar app.jar --spring.profiles.active=prod
```

**Environment variable:**
```bash
export SPRING_PROFILES_ACTIVE=prod
java -jar app.jar
```

**application.yml:**
```yaml
spring:
  profiles:
    active: dev
```

### Profile-Specific Components

```java
@Service
@Profile("dev")
@Slf4j
public class MockRadioClient implements RadioClient {
    @Override
    public void syncRadio(Radio radio) {
        log.info("Mock: Syncing radio {}", radio.getId());
        // Mock implementation for development
    }
}

@Service
@Profile("prod")
@RequiredArgsConstructor
@Slf4j
public class RestRadioClient implements RadioClient {
    private final WebClient webClient;
    private final AppConfigs appConfigs;

    @Override
    public void syncRadio(Radio radio) {
        log.info("REST: Syncing radio {}", radio.getId());
        // Real implementation for production
        webClient.post()
            .uri(appConfigs.apiUrl() + "/radios")
            .bodyValue(radio)
            .retrieve()
            .bodyToMono(Void.class)
            .block();
    }
}
```

---

## Virtual Threads Configuration

### Enable Virtual Threads

**application.yml:**
```yaml
spring:
  threads:
    virtual:
      enabled: true
```

### Custom Virtual Thread Executor

```java
@Configuration
public class VirtualThreadConfiguration {

    @Bean
    public AsyncTaskExecutor applicationTaskExecutor() {
        TaskExecutorAdapter adapter = new TaskExecutorAdapter(
            Executors.newVirtualThreadPerTaskExecutor()
        );
        adapter.setTaskDecorator(runnable -> {
            // Add task decoration if needed
            return runnable;
        });
        return adapter;
    }
}
```

### Using Virtual Threads

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RadioService {
    private final RadioRepository radioRepository;
    private final ExternalRadioClient externalClient;

    @Async
    public CompletableFuture<Void> syncRadioAsync(String radioId) {
        log.info("Syncing radio {} on virtual thread", radioId);
        Radio radio = radioRepository.findById(radioId).orElseThrow();
        externalClient.syncRadio(radio);
        return CompletableFuture.completedFuture(null);
    }
}
```

---

## External Client Configuration

### WebClient Configuration

```java
@Configuration
public class WebClientConfiguration {

    @Bean
    public WebClient radioWebClient(AppConfigs appConfigs) {
        return WebClient.builder()
            .baseUrl(appConfigs.radioApiUrl())
            .defaultHeader("Content-Type", "application/json")
            .defaultHeader("Accept", "application/json")
            .clientConnector(new ReactorClientHttpConnector(
                HttpClient.create()
                    .responseTimeout(Duration.ofMillis(appConfigs.httpTimeoutMs()))
            ))
            .filter(loggingFilter())
            .build();
    }

    private ExchangeFilterFunction loggingFilter() {
        return ExchangeFilterFunction.ofRequestProcessor(clientRequest -> {
            log.info("Request: {} {}", clientRequest.method(), clientRequest.url());
            return Mono.just(clientRequest);
        });
    }
}
```

### RestTemplate Configuration (Legacy)

```java
@Configuration
public class RestTemplateConfiguration {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder, AppConfigs appConfigs) {
        return builder
            .setConnectTimeout(Duration.ofMillis(appConfigs.httpTimeoutMs()))
            .setReadTimeout(Duration.ofMillis(appConfigs.httpTimeoutMs()))
            .build();
    }
}
```

---

## Best Practices

### 1. Use Records for Configuration

```java
// GOOD: Record for immutable configuration
@ConfigurationProperties(prefix = "app")
public record AppConfig(
    String apiUrl,
    int timeout
) {}

// BAD: Class with mutable fields
@ConfigurationProperties(prefix = "app")
@Data
public class AppConfig {
    private String apiUrl;
    private int timeout;
}
```

### 2. Validate Configuration

```java
// GOOD: Validate configuration
@ConfigurationProperties(prefix = "app")
@Validated
public record AppConfig(
    @NotBlank(message = "API URL is required")
    String apiUrl,

    @Min(1000)
    @Max(60000)
    int timeout
) {}

// BAD: No validation
@ConfigurationProperties(prefix = "app")
public record AppConfig(String apiUrl, int timeout) {}
```

### 3. Use Default Values

```java
// GOOD: Default values
@ConfigurationProperties(prefix = "app")
public record AppConfig(
    @DefaultValue("http://localhost:8080")
    String apiUrl,

    @DefaultValue("5000")
    int timeout
) {}

// BAD: No defaults - null if not configured
@ConfigurationProperties(prefix = "app")
public record AppConfig(String apiUrl, int timeout) {}
```

### 4. Group Related Configuration

```java
// GOOD: Grouped configuration
@ConfigurationProperties(prefix = "app")
public record AppConfiguration(
    Server server,
    Database database,
    Cache cache
) {
    public record Server(int port, boolean enableVirtualThreads) {}
    public record Database(String url, String username, String password) {}
    public record Cache(int maxSize, int ttlMinutes) {}
}

// BAD: Flat configuration
@ConfigurationProperties(prefix = "app")
public record AppConfiguration(
    int serverPort,
    boolean serverEnableVirtualThreads,
    String databaseUrl,
    String databaseUsername,
    String databasePassword,
    int cacheMaxSize,
    int cacheTtlMinutes
) {}
```

### 5. Use Environment Variables for Secrets

```yaml
# GOOD: Environment variables for secrets
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/db
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

# BAD: Hardcoded secrets
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/db
    username: admin
    password: secret123
```

### 6. Log Configuration on Startup

```java
// GOOD: Log configuration
@ConfigurationProperties(prefix = "app")
public record AppConfig(String apiUrl, int timeout) {
    @PostConstruct
    public void init() {
        log.info("Loaded configuration: apiUrl={}, timeout={}ms", apiUrl, timeout);
    }
}

// BAD: Silent configuration
@ConfigurationProperties(prefix = "app")
public record AppConfig(String apiUrl, int timeout) {}
```

---

## Common Pitfalls

### 1. Missing @EnableConfigurationProperties

```java
// BAD: Configuration not enabled
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// AppConfigs will not be loaded!

// GOOD: Enable configuration properties
@SpringBootApplication
@EnableConfigurationProperties(AppConfigs.class)
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

### 2. Using @Component Instead of @ConfigurationProperties

```java
// BAD: Using @Component
@Component
public record AppConfig(String apiUrl, int timeout) {}
// Values won't be injected from application.yml

// GOOD: Use @ConfigurationProperties
@ConfigurationProperties(prefix = "app")
public record AppConfig(String apiUrl, int timeout) {}
```

### 3. Wrong Property Names

```java
// Configuration class
@ConfigurationProperties(prefix = "app")
public record AppConfig(
    String apiUrl,  // Maps to app.api-url or app.apiUrl
    int timeoutMs   // Maps to app.timeout-ms or app.timeoutMs
) {}

// BAD: Wrong YAML property names
app:
  api_url: http://localhost  # Wrong: uses underscore
  timeout: 5000              # Wrong: missing -ms suffix

// GOOD: Correct YAML property names
app:
  api-url: http://localhost  # Correct: kebab-case
  timeout-ms: 5000           # Correct: matches field name
```

### 4. Not Using Profiles

```java
// BAD: Same configuration for all environments
app:
  api-url: http://localhost:8080
  timeout-ms: 5000

// GOOD: Profile-specific configuration
# application.yml
app:
  timeout-ms: 5000

# application-dev.yml
app:
  api-url: http://localhost:8080

# application-prod.yml
app:
  api-url: https://api.production.com
```

### 5. Hardcoding Configuration in Code

```java
// BAD: Hardcoded configuration
@Service
public class RadioClient {
    private static final String API_URL = "http://localhost:8080";
    private static final int TIMEOUT = 5000;

    public void syncRadio(Radio radio) {
        // Uses hardcoded values
    }
}

// GOOD: Inject configuration
@Service
@RequiredArgsConstructor
public class RadioClient {
    private final AppConfigs appConfigs;

    public void syncRadio(Radio radio) {
        String apiUrl = appConfigs.apiUrl();
        int timeout = appConfigs.timeout();
    }
}
```

### 6. Mutable Configuration Records

```java
// BAD: Trying to make record mutable
@ConfigurationProperties(prefix = "app")
public record AppConfig(String apiUrl, int timeout) {
    public void setApiUrl(String apiUrl) {
        // Won't work - records are immutable!
    }
}

// GOOD: Use immutable records
@ConfigurationProperties(prefix = "app")
public record AppConfig(String apiUrl, int timeout) {
    // No setters - immutable by design
}
```

---

## Summary

Configuration management in Spring Boot follows these key patterns:

1. **Use records with `@ConfigurationProperties`** for immutable configuration
2. **Enable with `@EnableConfigurationProperties`** in main application class
3. **Validate configuration** with `@Validated` and Jakarta Validation
4. **Use default values** with `@DefaultValue` annotation
5. **Group related configuration** with nested records
6. **Profile-specific configuration** with application-{profile}.yml files
7. **Environment variables for secrets** (never hardcode)
8. **Enable virtual threads** in application.yml for better scalability
9. **Configure external clients** (WebClient) as beans
10. **Log configuration on startup** with `@PostConstruct`

Follow these patterns for clean, maintainable application configuration.