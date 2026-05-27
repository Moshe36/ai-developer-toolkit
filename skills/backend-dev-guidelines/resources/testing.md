# Testing

Comprehensive guide to testing Spring Boot applications with unit tests, integration tests, and GraphQL/REST API testing.

---

## Table of Contents

1. [Unit Testing with Mockito](#unit-testing-with-mockito)
2. [Integration Testing](#integration-testing)
3. [Testing REST Controllers](#testing-rest-controllers)
4. [Testing GraphQL Controllers](#testing-graphql-controllers)
5. [Testing Services](#testing-services)
6. [Testing Repositories](#testing-repositories)
7. [Best Practices](#best-practices)
8. [Common Pitfalls](#common-pitfalls)

---

## Unit Testing with Mockito

### Basic Unit Test Structure

```java
package com.company.project.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RadioServiceTest {

    @Mock
    private RadioRepository radioRepository;

    @Mock
    private RadioClient radioClient;

    @InjectMocks
    private RadioService radioService;

    private Radio testRadio;

    @BeforeEach
    void setUp() {
        testRadio = Radio.builder()
            .id("radio-123")
            .name("Test Radio")
            .type(RadioType.TYPE_A)
            .status(RadioStatus.ACTIVE)
            .build();
    }

    @Test
    void getRadio_whenRadioExists_returnsRadio() {
        // Given
        String radioId = "radio-123";
        when(radioRepository.findById(radioId)).thenReturn(Optional.of(testRadio));

        // When
        Radio result = radioService.getRadio(radioId);

        // Then
        assertNotNull(result);
        assertEquals(radioId, result.getId());
        assertEquals("Test Radio", result.getName());
        verify(radioRepository, times(1)).findById(radioId);
    }

    @Test
    void getRadio_whenRadioNotFound_throwsException() {
        // Given
        String radioId = "nonexistent";
        when(radioRepository.findById(radioId)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class, () -> {
            radioService.getRadio(radioId);
        });
        verify(radioRepository, times(1)).findById(radioId);
    }
}
```

### Mockito Verification

```java
@Test
void createRadio_whenValidInput_createsRadioAndSyncs() {
    // Given
    CreateRadioCommand command = CreateRadioCommand.builder()
        .name("New Radio")
        .type(RadioType.TYPE_A)
        .build();

    Radio savedRadio = Radio.builder()
        .id("radio-456")
        .name("New Radio")
        .type(RadioType.TYPE_A)
        .status(RadioStatus.INACTIVE)
        .build();

    when(radioRepository.save(any(Radio.class))).thenReturn(savedRadio);
    doNothing().when(radioClient).createRadio(any(Radio.class));

    // When
    Radio result = radioService.createRadio(command);

    // Then
    assertNotNull(result);
    assertEquals("radio-456", result.getId());
    assertEquals("New Radio", result.getName());

    // Verify interactions
    verify(radioRepository, times(1)).save(any(Radio.class));
    verify(radioClient, times(1)).createRadio(savedRadio);
    verifyNoMoreInteractions(radioRepository, radioClient);
}
```

### Argument Captors

```java
@Test
void updateRadio_whenValidUpdate_savesCorrectRadio() {
    // Given
    String radioId = "radio-123";
    UpdateRadioCommand command = UpdateRadioCommand.builder()
        .name("Updated Name")
        .status(RadioStatus.ACTIVE)
        .build();

    when(radioRepository.findById(radioId)).thenReturn(Optional.of(testRadio));
    when(radioRepository.save(any(Radio.class))).thenReturn(testRadio);

    ArgumentCaptor<Radio> radioCaptor = ArgumentCaptor.forClass(Radio.class);

    // When
    radioService.updateRadio(radioId, command);

    // Then
    verify(radioRepository).save(radioCaptor.capture());
    Radio capturedRadio = radioCaptor.getValue();

    assertEquals("Updated Name", capturedRadio.getName());
    assertEquals(RadioStatus.ACTIVE, capturedRadio.getStatus());
}
```

### Exception Testing

```java
@Test
void createRadio_whenNameAlreadyExists_throwsException() {
    // Given
    CreateRadioCommand command = CreateRadioCommand.builder()
        .name("Existing Radio")
        .type(RadioType.TYPE_A)
        .build();

    when(radioRepository.existsByName("Existing Radio")).thenReturn(true);

    // When & Then
    ResourceAlreadyExistsException exception = assertThrows(
        ResourceAlreadyExistsException.class,
        () -> radioService.createRadio(command)
    );

    assertEquals("Radio already exists with name: Existing Radio", exception.getMessage());
    verify(radioRepository, times(1)).existsByName("Existing Radio");
    verify(radioRepository, never()).save(any(Radio.class));
}
```

---

## Integration Testing

### Spring Boot Test

```java
package com.company.project;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class RadioIntegrationTest {

    @Autowired
    private RadioService radioService;

    @Autowired
    private RadioRepository radioRepository;

    @Test
    void createRadio_fullFlow_createsRadioSuccessfully() {
        // Given
        CreateRadioCommand command = CreateRadioCommand.builder()
            .name("Integration Test Radio")
            .type(RadioType.TYPE_A)
            .build();

        // When
        Radio created = radioService.createRadio(command);

        // Then
        assertNotNull(created.getId());
        assertEquals("Integration Test Radio", created.getName());

        // Verify it's in repository
        Radio found = radioRepository.findById(created.getId()).orElseThrow();
        assertEquals(created.getId(), found.getId());
        assertEquals(created.getName(), found.getName());
    }
}
```

### Test Configuration

```java
package com.company.project.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration
public class TestConfig {

    @Bean
    @Primary
    public RadioClient mockRadioClient() {
        return new MockRadioClient();
    }

    @Bean
    @Primary
    public CacheManager testCacheManager() {
        return new CaffeineCacheManager("radios", "links");
    }
}
```

### application-test.yml

```yaml
spring:
  cache:
    type: caffeine

app:
  configs:
    http-timeout-ms: 1000
    cache-size: 10
    max-retries: 1

logging:
  level:
    root: INFO
    com.company.project: DEBUG
```

---

## Testing REST Controllers

### MockMvc Test

```java
package com.company.project.controllers;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.Mockito.*;

@WebMvcTest(RadioRestController.class)
class RadioRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RadioService radioService;

    @MockBean
    private RadioMapper radioMapper;

    @Test
    void getRadio_whenRadioExists_returnsRadio() throws Exception {
        // Given
        String radioId = "radio-123";
        Radio radio = Radio.builder()
            .id(radioId)
            .name("Test Radio")
            .build();

        RadioDto dto = new RadioDto();
        dto.setId(radioId);
        dto.setName("Test Radio");

        when(radioService.getRadio(radioId)).thenReturn(radio);
        when(radioMapper.toDto(radio)).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/radios/{radioId}", radioId))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.id").value(radioId))
            .andExpect(jsonPath("$.name").value("Test Radio"));

        verify(radioService, times(1)).getRadio(radioId);
    }

    @Test
    void createRadio_whenValidInput_returnsCreated() throws Exception {
        // Given
        CreateRadioRequest request = new CreateRadioRequest();
        request.setName("New Radio");
        request.setType("TYPE_A");

        Radio created = Radio.builder()
            .id("radio-456")
            .name("New Radio")
            .type(RadioType.TYPE_A)
            .build();

        RadioDto dto = new RadioDto();
        dto.setId("radio-456");
        dto.setName("New Radio");

        when(radioService.createRadio(any())).thenReturn(created);
        when(radioMapper.toDto(created)).thenReturn(dto);

        // When & Then
        mockMvc.perform(post("/api/v1/radios")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", "/api/v1/radios/radio-456"))
            .andExpect(jsonPath("$.id").value("radio-456"))
            .andExpect(jsonPath("$.name").value("New Radio"));
    }

    @Test
    void getRadio_whenRadioNotFound_returnsNotFound() throws Exception {
        // Given
        String radioId = "nonexistent";
        when(radioService.getRadio(radioId))
            .thenThrow(new ResourceNotFoundException("Radio", radioId));

        // When & Then
        mockMvc.perform(get("/api/v1/radios/{radioId}", radioId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Radio not found with ID: nonexistent"));
    }
}
```

---

## Testing GraphQL Controllers

### GraphQL Testing with HttpGraphQlTester

```java
package com.company.project.controllers;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.graphql.GraphQlTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.graphql.test.tester.HttpGraphQlTester;
import static org.mockito.Mockito.*;

@GraphQlTest(LinkController.class)
class LinkControllerTest {

    @Autowired
    private HttpGraphQlTester graphQlTester;

    @MockBean
    private LinkService linkService;

    @MockBean
    private FrontendMapper frontendMapper;

    @Test
    void link_whenLinkExists_returnsLink() {
        // Given
        String radioId = "radio-123";
        String linkId = "link-456";

        Link link = Link.builder()
            .id(linkId)
            .name("Test Link")
            .status(LinkStatus.ACTIVE)
            .build();

        LinkGql linkGql = new LinkGql(linkId, "Test Link", LinkStatusGql.ACTIVE, null);

        when(linkService.getLink(radioId, linkId)).thenReturn(link);
        when(frontendMapper.toGql(link)).thenReturn(linkGql);

        // When & Then
        graphQlTester.document("""
                query {
                    link(radioId: "radio-123", linkId: "link-456") {
                        id
                        name
                        status
                    }
                }
                """)
            .execute()
            .path("link.id").entity(String.class).isEqualTo(linkId)
            .path("link.name").entity(String.class).isEqualTo("Test Link")
            .path("link.status").entity(String.class).isEqualTo("ACTIVE");

        verify(linkService, times(1)).getLink(radioId, linkId);
    }

    @Test
    void updateLink_whenValidInput_updatesLink() {
        // Given
        UpdateLinkInput input = new UpdateLinkInput(
            "link-456",
            "radio-123",
            "Updated Link",
            LinkStatusGql.ACTIVE
        );

        Link updated = Link.builder()
            .id("link-456")
            .name("Updated Link")
            .status(LinkStatus.ACTIVE)
            .build();

        LinkGql linkGql = new LinkGql("link-456", "Updated Link", LinkStatusGql.ACTIVE, null);

        when(frontendMapper.toDomain(input)).thenReturn(updated);
        when(linkService.updateLink(any(Link.class))).thenReturn(updated);
        when(frontendMapper.toGql(updated)).thenReturn(linkGql);

        // When & Then
        graphQlTester.document("""
                mutation($input: UpdateLinkInput!) {
                    updateLink(input: $input) {
                        id
                        name
                        status
                    }
                }
                """)
            .variable("input", Map.of(
                "linkId", "link-456",
                "radioId", "radio-123",
                "name", "Updated Link",
                "status", "ACTIVE"
            ))
            .execute()
            .path("updateLink.name").entity(String.class).isEqualTo("Updated Link");
    }

    @Test
    void link_whenLinkNotFound_returnsError() {
        // Given
        String radioId = "radio-123";
        String linkId = "nonexistent";

        when(linkService.getLink(radioId, linkId))
            .thenThrow(new ResourceNotFoundException("Link", linkId));

        // When & Then
        graphQlTester.document("""
                query {
                    link(radioId: "radio-123", linkId: "nonexistent") {
                        id
                        name
                    }
                }
                """)
            .execute()
            .errors()
            .expect(error -> error.getMessage().contains("Link not found"));
    }
}
```

---

## Testing Services

### Service Unit Tests

```java
@ExtendWith(MockitoExtension.class)
class LinkServiceTest {

    @Mock
    private RadioService radioService;

    @Mock
    private LinkRepository linkRepository;

    @Mock
    private RadioClient radioClient;

    @InjectMocks
    private LinkService linkService;

    private Radio testRadio;
    private Link testLink;

    @BeforeEach
    void setUp() {
        testLink = Link.builder()
            .id("link-123")
            .name("Test Link")
            .status(LinkStatus.ACTIVE)
            .build();

        testRadio = Radio.builder()
            .id("radio-123")
            .name("Test Radio")
            .links(List.of(testLink))
            .build();
    }

    @Test
    void getLink_whenLinkExists_returnsLink() {
        // Given
        String radioId = "radio-123";
        String linkId = "link-123";
        when(radioService.getRadio(radioId)).thenReturn(testRadio);

        // When
        Link result = linkService.getLink(radioId, linkId);

        // Then
        assertNotNull(result);
        assertEquals(linkId, result.getId());
        verify(radioService, times(1)).getRadio(radioId);
    }

    @Test
    void deleteLink_whenLinkIsActive_throwsException() {
        // Given
        String radioId = "radio-123";
        String linkId = "link-123";
        when(radioService.getRadio(radioId)).thenReturn(testRadio);

        // When & Then
        InvalidOperationException exception = assertThrows(
            InvalidOperationException.class,
            () -> linkService.deleteLink(radioId, linkId)
        );

        assertTrue(exception.getMessage().contains("Link must be deactivated"));
        verify(linkRepository, never()).deleteById(anyString());
    }
}
```

---

## Testing Repositories

### Repository Tests

```java
package com.company.project.repositories;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;

class RadioRepositoryTest {

    private RadioRepository radioRepository;
    private Radio testRadio;

    @BeforeEach
    void setUp() {
        radioRepository = new RadioRepository();

        testRadio = Radio.builder()
            .name("Test Radio")
            .type(RadioType.TYPE_A)
            .status(RadioStatus.ACTIVE)
            .build();
    }

    @Test
    void save_whenNewRadio_generatesIdAndSaves() {
        // When
        Radio saved = radioRepository.save(testRadio);

        // Then
        assertNotNull(saved.getId());
        assertEquals("Test Radio", saved.getName());

        // Verify it can be retrieved
        Optional<Radio> found = radioRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals(saved.getId(), found.get().getId());
    }

    @Test
    void findById_whenRadioExists_returnsRadio() {
        // Given
        Radio saved = radioRepository.save(testRadio);

        // When
        Optional<Radio> result = radioRepository.findById(saved.getId());

        // Then
        assertTrue(result.isPresent());
        assertEquals(saved.getId(), result.get().getId());
    }

    @Test
    void findById_whenRadioNotFound_returnsEmpty() {
        // When
        Optional<Radio> result = radioRepository.findById("nonexistent");

        // Then
        assertFalse(result.isPresent());
    }

    @Test
    void deleteById_whenRadioExists_deletesRadio() {
        // Given
        Radio saved = radioRepository.save(testRadio);
        String radioId = saved.getId();

        // When
        radioRepository.deleteById(radioId);

        // Then
        Optional<Radio> result = radioRepository.findById(radioId);
        assertFalse(result.isPresent());
    }

    @Test
    void existsByName_whenNameExists_returnsTrue() {
        // Given
        radioRepository.save(testRadio);

        // When
        boolean exists = radioRepository.existsByName("Test Radio");

        // Then
        assertTrue(exists);
    }

    @Test
    void existsByName_whenNameNotFound_returnsFalse() {
        // When
        boolean exists = radioRepository.existsByName("Nonexistent");

        // Then
        assertFalse(exists);
    }
}
```

---

## Best Practices

### 1. Follow AAA Pattern

```java
// GOOD: Arrange-Act-Assert
@Test
void getRadio_whenRadioExists_returnsRadio() {
    // Arrange (Given)
    String radioId = "radio-123";
    when(radioRepository.findById(radioId)).thenReturn(Optional.of(testRadio));

    // Act (When)
    Radio result = radioService.getRadio(radioId);

    // Assert (Then)
    assertNotNull(result);
    assertEquals(radioId, result.getId());
}

// BAD: Mixed concerns
@Test
void test() {
    when(radioRepository.findById("123")).thenReturn(Optional.of(testRadio));
    Radio result = radioService.getRadio("123");
    assertNotNull(result);
    when(radioRepository.findById("456")).thenReturn(Optional.empty());
    assertThrows(Exception.class, () -> radioService.getRadio("456"));
}
```

### 2. Descriptive Test Names

```java
// GOOD: Descriptive names
@Test
void getRadio_whenRadioExists_returnsRadio() { }

@Test
void getRadio_whenRadioNotFound_throwsResourceNotFoundException() { }

@Test
void createRadio_whenNameAlreadyExists_throwsResourceAlreadyExistsException() { }

// BAD: Unclear names
@Test
void test1() { }

@Test
void testGetRadio() { }

@Test
void shouldWork() { }
```

### 3. Test One Thing Per Test

```java
// GOOD: One assertion per test
@Test
void getRadio_whenRadioExists_returnsRadioWithCorrectId() {
    Radio result = radioService.getRadio("radio-123");
    assertEquals("radio-123", result.getId());
}

@Test
void getRadio_whenRadioExists_returnsRadioWithCorrectName() {
    Radio result = radioService.getRadio("radio-123");
    assertEquals("Test Radio", result.getName());
}

// BAD: Testing multiple things
@Test
void getRadio_test() {
    Radio result = radioService.getRadio("radio-123");
    assertEquals("radio-123", result.getId());
    assertEquals("Test Radio", result.getName());
    assertEquals(RadioStatus.ACTIVE, result.getStatus());
    // If first assertion fails, others don't run
}
```

### 4. Use @BeforeEach for Common Setup

```java
// GOOD: Common setup in @BeforeEach
@BeforeEach
void setUp() {
    testRadio = Radio.builder()
        .id("radio-123")
        .name("Test Radio")
        .build();
}

@Test
void test1() {
    // Use testRadio
}

@Test
void test2() {
    // Use testRadio
}

// BAD: Duplicate setup
@Test
void test1() {
    Radio testRadio = Radio.builder()
        .id("radio-123")
        .name("Test Radio")
        .build();
}

@Test
void test2() {
    Radio testRadio = Radio.builder()
        .id("radio-123")
        .name("Test Radio")
        .build();
}
```

### 5. Verify Interactions

```java
// GOOD: Verify mock interactions
@Test
void createRadio_whenValidInput_savesAndSyncs() {
    radioService.createRadio(command);

    verify(radioRepository, times(1)).save(any(Radio.class));
    verify(radioClient, times(1)).createRadio(any(Radio.class));
    verifyNoMoreInteractions(radioRepository, radioClient);
}

// BAD: No verification
@Test
void createRadio_whenValidInput_savesAndSyncs() {
    radioService.createRadio(command);
    // Did it actually call repository and client?
}
```

---

## Common Pitfalls

### 1. Not Using @ExtendWith(MockitoExtension.class)

```java
// BAD: Mocks not initialized
class RadioServiceTest {
    @Mock
    private RadioRepository radioRepository;  // Will be null!

    @InjectMocks
    private RadioService radioService;  // Dependencies not injected!
}

// GOOD: Use MockitoExtension
@ExtendWith(MockitoExtension.class)
class RadioServiceTest {
    @Mock
    private RadioRepository radioRepository;

    @InjectMocks
    private RadioService radioService;
}
```

### 2. Testing Implementation Details

```java
// BAD: Testing internal implementation
@Test
void createRadio_callsRepositoryFirst() {
    InOrder inOrder = inOrder(radioRepository, radioClient);

    radioService.createRadio(command);

    inOrder.verify(radioRepository).save(any());
    inOrder.verify(radioClient).createRadio(any());
}

// GOOD: Test behavior
@Test
void createRadio_whenValidInput_createsRadio() {
    Radio result = radioService.createRadio(command);

    assertNotNull(result);
    assertEquals("New Radio", result.getName());
}
```

### 3. Over-Mocking

```java
// BAD: Mocking too much
@Test
void test() {
    when(radio.getId()).thenReturn("123");
    when(radio.getName()).thenReturn("Test");
    when(radio.getStatus()).thenReturn(RadioStatus.ACTIVE);
    // Use real object instead!
}

// GOOD: Use real objects when possible
@Test
void test() {
    Radio radio = Radio.builder()
        .id("123")
        .name("Test")
        .status(RadioStatus.ACTIVE)
        .build();
    // Real object, no mocking needed
}
```

### 4. Not Cleaning Up Test Data

```java
// BAD: Test data persists
@SpringBootTest
class IntegrationTest {
    @Test
    void test1() {
        radioRepository.save(testRadio);
        // Data remains in repository
    }

    @Test
    void test2() {
        // Affected by test1's data!
    }
}

// GOOD: Clean up after each test
@SpringBootTest
class IntegrationTest {
    @AfterEach
    void tearDown() {
        radioRepository.deleteAll();
    }

    @Test
    void test1() {
        radioRepository.save(testRadio);
    }

    @Test
    void test2() {
        // Clean slate
    }
}
```

### 5. Ignoring Test Failures

```java
// BAD: Ignoring test
@Test
@Disabled("Fails sometimes, will fix later")
void flaky_test() {
    // Test that sometimes fails
}

// GOOD: Fix or remove test
@Test
void stable_test() {
    // Reliable test
}
```

---

## Summary

Testing in Spring Boot follows these key patterns:

### Unit Testing:
1. **`@ExtendWith(MockitoExtension.class)`** for Mockito support
2. **`@Mock`** for dependencies, **`@InjectMocks`** for class under test
3. **AAA pattern**: Arrange-Act-Assert
4. **Verify interactions** with `verify()`
5. **Test one thing** per test method

### Integration Testing:
6. **`@SpringBootTest`** for full application context
7. **`@ActiveProfiles("test")`** for test configuration
8. **Clean up test data** with `@AfterEach`

### Controller Testing:
9. **`@WebMvcTest`** for REST controller testing
10. **`@GraphQlTest`** for GraphQL controller testing
11. **MockMvc** for REST endpoint testing
12. **HttpGraphQlTester** for GraphQL testing

Follow these patterns for comprehensive, maintainable test coverage.