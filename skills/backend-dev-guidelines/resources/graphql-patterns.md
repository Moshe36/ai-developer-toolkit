# GraphQL Patterns

Comprehensive guide to implementing GraphQL APIs with Spring GraphQL, including controller patterns, schema organization, input types, and best practices.

---

## Table of Contents

1. [GraphQL Controller Basics](#graphql-controller-basics)
2. [Query Patterns](#query-patterns)
3. [Mutation Patterns](#mutation-patterns)
4. [Input Types](#input-types)
5. [Schema Organization](#schema-organization)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Common Pitfalls](#common-pitfalls)

---

## GraphQL Controller Basics

### Basic Controller Structure

```java
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.stereotype.Controller;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class LinkController {
    private final LinkService linkService;
    private final FrontendMapper mapper;

    @QueryMapping("link")
    public LinkGql link(
        @Argument("radioId") @NotBlank String radioId,
        @Argument("linkId") @NotBlank String linkId
    ) {
        Link link = linkService.getLink(radioId, linkId);
        return mapper.toGql(link);
    }

    @MutationMapping("updateLink")
    public LinkGql updateLink(@Argument("input") @Valid UpdateLinkInput input) {
        Link updated = linkService.updateLink(mapper.toDomain(input));
        return mapper.toGql(updated);
    }
}
```

### Key Annotations

- **`@Controller`**: Marks class as GraphQL controller (NOT `@RestController`)
- **`@QueryMapping`**: Maps GraphQL query to method
- **`@MutationMapping`**: Maps GraphQL mutation to method
- **`@Argument`**: Binds GraphQL argument to method parameter
- **`@Valid`**: Enables validation on input objects
- **`@NotBlank`**: Validates string arguments are not blank

---

## Query Patterns

### Simple Query

```java
@Controller
@RequiredArgsConstructor
public class RadioController {
    private final RadioService radioService;
    private final FrontendMapper mapper;

    @QueryMapping("radio")
    public RadioGql radio(@Argument("radioId") @NotBlank String radioId) {
        Radio radio = radioService.getRadio(radioId);
        return mapper.toGql(radio);
    }
}
```

**GraphQL Schema:**
```graphql
type Query {
  radio(radioId: ID!): Radio
}

type Radio {
  id: ID!
  name: String!
  status: RadioStatus!
}
```

### Query with Multiple Arguments

```java
@Controller
@RequiredArgsConstructor
public class LinkController {
    private final LinkService linkService;
    private final FrontendMapper mapper;

    @QueryMapping("link")
    public LinkGql link(
        @Argument("radioId") @NotBlank String radioId,
        @Argument("linkId") @NotBlank String linkId
    ) {
        Link link = linkService.getLink(radioId, linkId);
        return mapper.toGql(link);
    }
}
```

**GraphQL Schema:**
```graphql
type Query {
  link(radioId: ID!, linkId: ID!): Link
}

type Link {
  id: ID!
  name: String!
  status: LinkStatus!
  description: String
}
```

### Query Returning List

```java
@Controller
@RequiredArgsConstructor
public class RadioController {
    private final RadioService radioService;
    private final FrontendMapper mapper;

    @QueryMapping("radios")
    public List<RadioGql> radios(
        @Argument("status") RadioStatusGql status
    ) {
        List<Radio> radios = radioService.getRadiosByStatus(mapper.toDomain(status));
        return radios.stream()
            .map(mapper::toGql)
            .toList();
    }
}
```

**GraphQL Schema:**
```graphql
type Query {
  radios(status: RadioStatus): [Radio!]!
}
```

### Query with Optional Arguments

```java
@Controller
@RequiredArgsConstructor
public class LinkController {
    private final LinkService linkService;
    private final FrontendMapper mapper;

    @QueryMapping("links")
    public List<LinkGql> links(
        @Argument("radioId") @NotBlank String radioId,
        @Argument("status") LinkStatusGql status  // Optional
    ) {
        List<Link> links;
        if (status != null) {
            links = linkService.getLinksByRadioAndStatus(radioId, mapper.toDomain(status));
        } else {
            links = linkService.getLinksByRadio(radioId);
        }
        return links.stream()
            .map(mapper::toGql)
            .toList();
    }
}
```

**GraphQL Schema:**
```graphql
type Query {
  links(radioId: ID!, status: LinkStatus): [Link!]!
}
```

---

## Mutation Patterns

### Simple Mutation with Input Type

```java
@Controller
@RequiredArgsConstructor
public class LinkController {
    private final LinkService linkService;
    private final FrontendMapper mapper;

    @MutationMapping("updateLink")
    public LinkGql updateLink(@Argument("input") @Valid UpdateLinkInput input) {
        Link updated = linkService.updateLink(mapper.toDomain(input));
        return mapper.toGql(updated);
    }
}
```

**Input DTO:**
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

**GraphQL Schema:**
```graphql
type Mutation {
  updateLink(input: UpdateLinkInput!): Link
}

input UpdateLinkInput {
  linkId: ID!
  radioId: ID!
  name: String!
  status: LinkStatus
}
```

### Mutation Returning Custom Response

```java
@Controller
@RequiredArgsConstructor
public class RadioController {
    private final RadioService radioService;
    private final FrontendMapper mapper;

    @MutationMapping("createRadio")
    public CreateRadioResponse createRadio(@Argument("input") @Valid CreateRadioInput input) {
        Radio created = radioService.createRadio(mapper.toDomain(input));
        return new CreateRadioResponse(
            mapper.toGql(created),
            "Radio created successfully"
        );
    }
}
```

**Response DTO:**
```java
public record CreateRadioResponse(
    RadioGql radio,
    String message
) {}
```

**GraphQL Schema:**
```graphql
type Mutation {
  createRadio(input: CreateRadioInput!): CreateRadioResponse!
}

type CreateRadioResponse {
  radio: Radio!
  message: String!
}
```

### Delete Mutation

```java
@Controller
@RequiredArgsConstructor
public class LinkController {
    private final LinkService linkService;

    @MutationMapping("deleteLink")
    public DeleteLinkResponse deleteLink(
        @Argument("radioId") @NotBlank String radioId,
        @Argument("linkId") @NotBlank String linkId
    ) {
        linkService.deleteLink(radioId, linkId);
        return new DeleteLinkResponse(true, "Link deleted successfully");
    }
}
```

**Response DTO:**
```java
public record DeleteLinkResponse(
    boolean success,
    String message
) {}
```

**GraphQL Schema:**
```graphql
type Mutation {
  deleteLink(radioId: ID!, linkId: ID!): DeleteLinkResponse!
}

type DeleteLinkResponse {
  success: Boolean!
  message: String!
}
```

### Batch Mutation

```java
@Controller
@RequiredArgsConstructor
public class LinkController {
    private final LinkService linkService;
    private final FrontendMapper mapper;

    @MutationMapping("updateLinks")
    public List<LinkGql> updateLinks(@Argument("inputs") @Valid List<UpdateLinkInput> inputs) {
        List<Link> updated = inputs.stream()
            .map(mapper::toDomain)
            .map(linkService::updateLink)
            .toList();

        return updated.stream()
            .map(mapper::toGql)
            .toList();
    }
}
```

**GraphQL Schema:**
```graphql
type Mutation {
  updateLinks(inputs: [UpdateLinkInput!]!): [Link!]!
}
```

---

## Input Types

### Basic Input Type

```java
package com.company.project.dto.gql;

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

### Input Type with Optional Fields

```java
public record UpdateLinkInput(
    @NotBlank(message = "Link ID is required")
    String linkId,

    String name,  // Optional
    LinkStatusGql status,  // Optional
    String description  // Optional
) {}
```

### Nested Input Types

```java
public record CreateRadioInput(
    @NotBlank
    String name,

    @NotNull
    RadioTypeGql type,

    @Valid  // Validate nested object
    RadioConfigInput config
) {}

public record RadioConfigInput(
    @Min(1)
    @Max(100)
    int maxLinks,

    boolean autoSync
) {}
```

**GraphQL Schema:**
```graphql
input CreateRadioInput {
  name: String!
  type: RadioType!
  config: RadioConfigInput!
}

input RadioConfigInput {
  maxLinks: Int!
  autoSync: Boolean!
}
```

### Input Type with Lists

```java
public record CreateRadioWithLinksInput(
    @NotBlank
    String name,

    @NotNull
    RadioTypeGql type,

    @Valid
    List<CreateLinkInput> links
) {}

public record CreateLinkInput(
    @NotBlank
    String name,

    @NotBlank
    String description
) {}
```

---

## Schema Organization

### Schema Files Structure

```
src/main/resources/graphql/
├── schema.graphqls          # Main schema file (imports others)
├── query.graphqls           # Query definitions
├── mutation.graphqls        # Mutation definitions
├── types/
│   ├── radio.graphqls      # Radio type and related types
│   ├── link.graphqls       # Link type and related types
│   └── common.graphqls     # Shared types
└── inputs/
    ├── radio-inputs.graphqls
    └── link-inputs.graphqls
```

### Main Schema File

**schema.graphqls:**
```graphql
schema {
  query: Query
  mutation: Mutation
}
```

### Query Definitions

**query.graphqls:**
```graphql
type Query {
  radio(radioId: ID!): Radio
  radios(status: RadioStatus): [Radio!]!
  link(radioId: ID!, linkId: ID!): Link
  links(radioId: ID!, status: LinkStatus): [Link!]!
}
```

### Mutation Definitions

**mutation.graphqls:**
```graphql
type Mutation {
  createRadio(input: CreateRadioInput!): CreateRadioResponse!
  updateRadio(input: UpdateRadioInput!): Radio
  deleteRadio(radioId: ID!): DeleteRadioResponse!

  createLink(input: CreateLinkInput!): Link
  updateLink(input: UpdateLinkInput!): Link
  deleteLink(radioId: ID!, linkId: ID!): DeleteLinkResponse!
}
```

### Type Definitions

**types/radio.graphqls:**
```graphql
type Radio {
  id: ID!
  name: String!
  type: RadioType!
  status: RadioStatus!
  links: [Link!]!
  createdAt: String!
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

type CreateRadioResponse {
  radio: Radio!
  message: String!
}

type DeleteRadioResponse {
  success: Boolean!
  message: String!
}
```

**types/link.graphqls:**
```graphql
type Link {
  id: ID!
  name: String!
  status: LinkStatus!
  description: String
  radioId: ID!
}

enum LinkStatus {
  ACTIVE
  INACTIVE
  PENDING
}
```

### Input Definitions

**inputs/radio-inputs.graphqls:**
```graphql
input CreateRadioInput {
  name: String!
  type: RadioType!
}

input UpdateRadioInput {
  radioId: ID!
  name: String
  status: RadioStatus
}
```

**inputs/link-inputs.graphqls:**
```graphql
input CreateLinkInput {
  radioId: ID!
  name: String!
  description: String
}

input UpdateLinkInput {
  linkId: ID!
  radioId: ID!
  name: String
  status: LinkStatus
  description: String
}
```

---

## Error Handling

### Domain Exception in Service

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class LinkService {
    private final LinkRepository linkRepository;

    public Link getLink(String radioId, String linkId) {
        return linkRepository.findById(linkId)
            .orElseThrow(() -> new LinkNotFoundException(
                "Link not found: " + linkId + " in radio: " + radioId
            ));
    }
}
```

### Custom Exception

```java
package com.company.project.infrastructure.exceptions;

public class LinkNotFoundException extends RuntimeException {
    public LinkNotFoundException(String message) {
        super(message);
    }
}
```

### GraphQL Exception Handler

```java
import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class GraphQLExceptionHandler extends DataFetcherExceptionResolverAdapter {

    @Override
    protected GraphQLError resolveToSingleError(
        Throwable ex,
        DataFetchingEnvironment env
    ) {
        if (ex instanceof LinkNotFoundException) {
            log.error("Link not found: {}", ex.getMessage());
            return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.NOT_FOUND)
                .message(ex.getMessage())
                .path(env.getExecutionStepInfo().getPath())
                .location(env.getField().getSourceLocation())
                .build();
        }

        if (ex instanceof IllegalArgumentException) {
            log.error("Invalid argument: {}", ex.getMessage());
            return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.BAD_REQUEST)
                .message(ex.getMessage())
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

### Validation Error Handling

Validation errors are handled automatically by Spring GraphQL:

```java
@MutationMapping("createRadio")
public RadioGql createRadio(@Argument("input") @Valid CreateRadioInput input) {
    // If validation fails, GraphQL returns error automatically
    Radio created = radioService.createRadio(mapper.toDomain(input));
    return mapper.toGql(created);
}
```

**Error Response:**
```json
{
  "errors": [
    {
      "message": "Validation error",
      "locations": [{"line": 2, "column": 3}],
      "path": ["createRadio"],
      "extensions": {
        "classification": "ValidationError",
        "name": "must not be blank"
      }
    }
  ]
}
```

---

## Best Practices

### 1. Keep Controllers Thin

```java
// GOOD: Delegate to service
@Controller
@RequiredArgsConstructor
public class LinkController {
    private final LinkService service;
    private final FrontendMapper mapper;

    @QueryMapping("link")
    public LinkGql link(@Argument String radioId, @Argument String linkId) {
        Link link = service.getLink(radioId, linkId);
        return mapper.toGql(link);
    }
}

// BAD: Business logic in controller
@Controller
public class LinkController {
    @QueryMapping("link")
    public LinkGql link(@Argument String radioId, @Argument String linkId) {
        Radio radio = radioRepository.findById(radioId).orElseThrow();
        Link link = radio.getLinkById(linkId);
        // Validation, mapping, and business logic here...
        return new LinkGql(link.getId(), link.getName());
    }
}
```

### 2. Always Validate Inputs

```java
// GOOD: Validate with annotations
@MutationMapping("updateLink")
public LinkGql updateLink(@Argument("input") @Valid UpdateLinkInput input) {
    // input is validated automatically
    Link updated = service.updateLink(mapper.toDomain(input));
    return mapper.toGql(updated);
}

// Input with validation
public record UpdateLinkInput(
    @NotBlank(message = "Link ID is required")
    String linkId,

    @Size(min = 3, max = 100)
    String name
) {}
```

### 3. Return Meaningful Types

```java
// GOOD: Return structured response
@MutationMapping("deleteLink")
public DeleteLinkResponse deleteLink(@Argument String radioId, @Argument String linkId) {
    service.deleteLink(radioId, linkId);
    return new DeleteLinkResponse(true, "Link deleted successfully");
}

public record DeleteLinkResponse(boolean success, String message) {}

// BAD: Return boolean
@MutationMapping("deleteLink")
public boolean deleteLink(@Argument String radioId, @Argument String linkId) {
    service.deleteLink(radioId, linkId);
    return true;  // Not enough information for client
}
```

### 4. Use Input Types for Mutations

```java
// GOOD: Use input type
@MutationMapping("updateLink")
public LinkGql updateLink(@Argument("input") @Valid UpdateLinkInput input) {
    // Single validated input object
    return service.updateLink(input);
}

// BAD: Multiple arguments
@MutationMapping("updateLink")
public LinkGql updateLink(
    @Argument String linkId,
    @Argument String radioId,
    @Argument String name,
    @Argument String status
) {
    // Hard to maintain, validate, and extend
    return service.updateLink(linkId, radioId, name, status);
}
```

### 5. Map Between Layers

```java
// GOOD: Use mapper
@Controller
@RequiredArgsConstructor
public class LinkController {
    private final LinkService service;
    private final FrontendMapper mapper;

    @QueryMapping("link")
    public LinkGql link(@Argument String radioId, @Argument String linkId) {
        Link link = service.getLink(radioId, linkId);
        return mapper.toGql(link);  // Clean mapping
    }
}

// BAD: Manual mapping in controller
@QueryMapping("link")
public LinkGql link(@Argument String radioId, @Argument String linkId) {
    Link link = service.getLink(radioId, linkId);
    return new LinkGql(
        link.getId(),
        link.getName(),
        LinkStatusGql.valueOf(link.getStatus().name())
    );  // Brittle, error-prone
}
```

---

## Common Pitfalls

### 1. Using @RestController

```java
// BAD: Using @RestController for GraphQL
@RestController
public class LinkController {
    @QueryMapping("link")
    public LinkGql link(@Argument String linkId) {
        // Won't work properly!
    }
}

// GOOD: Use @Controller
@Controller
public class LinkController {
    @QueryMapping("link")
    public LinkGql link(@Argument String linkId) {
        // Works correctly
    }
}
```

### 2. Missing @Argument Annotation

```java
// BAD: Missing @Argument
@QueryMapping("link")
public LinkGql link(String radioId, String linkId) {
    // Parameters won't be bound!
}

// GOOD: Use @Argument
@QueryMapping("link")
public LinkGql link(
    @Argument("radioId") String radioId,
    @Argument("linkId") String linkId
) {
    // Parameters correctly bound
}
```

### 3. Not Using Input Types

```java
// BAD: Multiple arguments for mutation
@MutationMapping("updateLink")
public LinkGql updateLink(
    @Argument String linkId,
    @Argument String name,
    @Argument String status
) {
    // Hard to maintain and validate
}

// GOOD: Use input type
@MutationMapping("updateLink")
public LinkGql updateLink(@Argument("input") @Valid UpdateLinkInput input) {
    // Clean, validated, maintainable
}
```

### 4. Returning null

```java
// BAD: Return null
@QueryMapping("link")
public LinkGql link(@Argument String linkId) {
    Link link = service.findLink(linkId);
    if (link == null) {
        return null;  // Unclear error
    }
    return mapper.toGql(link);
}

// GOOD: Throw exception
@QueryMapping("link")
public LinkGql link(@Argument String linkId) {
    Link link = service.getLink(linkId);  // Throws LinkNotFoundException
    return mapper.toGql(link);
}
```

### 5. Missing Validation

```java
// BAD: No validation
public record UpdateLinkInput(
    String linkId,
    String name
) {}

// GOOD: Add validation
public record UpdateLinkInput(
    @NotBlank(message = "Link ID is required")
    String linkId,

    @Size(min = 3, max = 100)
    String name
) {}
```

---

## Summary

GraphQL development with Spring GraphQL follows these key patterns:

1. **Use `@Controller`** (not `@RestController`) for GraphQL endpoints
2. **`@QueryMapping`** for queries, **`@MutationMapping`** for mutations
3. **`@Argument`** to bind GraphQL arguments to method parameters
4. **Input types** for complex mutations with `@Valid` validation
5. **Organize schemas** in separate files by domain
6. **Handle errors** with custom exception resolvers
7. **Keep controllers thin** - delegate to services
8. **Return meaningful types** - avoid booleans
9. **Map between layers** using MapStruct
10. **Validate all inputs** with Jakarta Validation

Follow these patterns for clean, maintainable GraphQL APIs.