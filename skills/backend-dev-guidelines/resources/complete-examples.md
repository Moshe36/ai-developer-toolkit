# Complete Feature Example

One connected **Spring Boot 4 / Java 21+** feature slice for an existing application: create, read, and rename a locally owned link. It includes a schema, immutable state, atomic mutation, mapping, access checks, error translation, and tests. It deliberately does not pretend a local rename is an external-device command.

## Contents

- [Prerequisites and contract](#prerequisites-and-contract)
- [Feature file map](#feature-file-map)
- [Schema](#schema)
- [Domain and repository](#domain-and-repository)
- [Application service](#application-service)
- [API types and mapping](#api-types-and-mapping)
- [Controller and security](#controller-and-security)
- [Error translation](#error-translation)
- [Unit tests](#unit-tests)
- [GraphQL slice tests](#graphql-slice-tests)
- [Adaptation](#adaptation)

## Prerequisites and contract

- An existing Boot application above `com.example.backend.feature.link`, with GraphQL schema resources enabled.
- Compatible GraphQL, validation, and security starters; MapStruct API and explicitly configured annotation processor. No Lombok is required for this example.
- For Boot 4 tests: GraphQL/security test starters, the normal JUnit/AssertJ test support they bring, and the Boot 4 slice import shown below. See [testing](testing.md) for Boot 3 differences.
- Authentication/principal creation and HTTP/WebSocket security remain the host application's responsibility. Method security must be enabled once. Test users are not production authentication configuration.
- Authorities `link:read` and `link:write` intentionally grant access to **all links**. A tenant/resource-owned API must add ownership checks; an arbitrary ID must not select another user's resource.
- The repository is ephemeral and unbounded for this example, suitable only for a small controlled dataset. A real feature must define capacity/retention or use durable storage when required. Rename is atomic per ID and last-write-wins; it is not optimistic locking or cross-process consistency.

Each Java block below is a separate file under the feature-local package shown in its heading. This example deliberately uses the same feature-first layout as the implementation recipe, with imports across the feature's layers. Do not copy a second method-security configuration into an application that already has one.

## Feature file map

```text
src/main/java/com/example/backend/feature/link/
├── controller/LinkController.java
├── service/LinkService.java
├── repository/LinkRepository.java
├── model/Link.java
├── dto/LinkGql.java
├── dto/CreateLinkInput.java
├── dto/RenameLinkInput.java
├── mapper/LinkMapper.java
├── config/LinkSecurityConfig.java
├── exception/LinkNotFoundException.java
└── handler/LinkApiExceptionResolver.java

src/main/resources/graphql/link.graphqls
src/test/java/com/example/backend/feature/link/
├── repository/LinkRepositoryTest.java
└── controller/LinkControllerGraphQlTest.java
```

Implement create/read first, then rename with its failure cases. Each slice crosses the participating files and is independently testable. For remote commands, use the [async operation pattern](core-patterns.md#async-operation-pattern).

## Schema

Place this SDL in `src/main/resources/graphql/link.graphqls`. Merge root definitions with the application's existing schema (`extend type` where appropriate) rather than declaring duplicate roots.

```graphql
type Query {
  link(id: ID!): Link!
}

type Mutation {
  createLink(input: CreateLinkInput!): Link!
  renameLink(input: RenameLinkInput!): Link!
}

type Link {
  id: ID!
  name: String!
}

input CreateLinkInput {
  name: String!
}

input RenameLinkInput {
  id: ID!
  name: String!
}
```

The non-null `Link!` result means a failed root field can make `data` null. Clients must inspect GraphQL errors; HTTP 200 alone does not mean the operation succeeded.

## Domain and repository

### `model/Link.java`

```java
package com.example.backend.feature.link.model;

public record Link(String id, String name) {
    public Link {
        requireText(id, "Link ID");
        requireText(name, "Link name");
    }

    public Link renameTo(String newName) {
        return new Link(id, newName);
    }

    private static void requireText(String value, String field) {
        if (isMissingText(value)) {
            throw new IllegalArgumentException(field + " is required");
        }
    }

    private static boolean isMissingText(String value) {
        return value == null || value.isBlank();
    }
}
```

### `exception/LinkNotFoundException.java`

```java
package com.example.backend.feature.link.exception;

public final class LinkNotFoundException extends RuntimeException {
    public LinkNotFoundException() {
        super("Link not found");
    }
}
```

### `repository/LinkRepository.java`

```java
package com.example.backend.feature.link.repository;

import com.example.backend.feature.link.exception.LinkNotFoundException;
import com.example.backend.feature.link.model.Link;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class LinkRepository {
    private final ConcurrentHashMap<String, Link> links = new ConcurrentHashMap<>();

    public Link create(String name) {
        Link created = new Link(UUID.randomUUID().toString(), name);
        Link previous = links.putIfAbsent(created.id(), created);
        if (previous != null) {
            throw new IllegalStateException("Generated duplicate link ID");
        }
        return created;
    }

    public Optional<Link> findById(String id) {
        return Optional.ofNullable(links.get(id));
    }

    public Link rename(String id, String name) {
        return links.compute(id, (key, current) -> renameExistingLink(current, name));
    }

    private Link renameExistingLink(Link current, String name) {
        if (current == null) {
            throw new LinkNotFoundException();
        }
        return current.renameTo(name);
    }
}
```

`compute` keeps the existence check and replacement atomic for the key. Its callback only constructs an immutable value: it performs no network I/O, blocking wait, event publication, or call into user code. A failed callback leaves the old mapping unchanged.

## Application service

### `service/LinkService.java`

```java
package com.example.backend.feature.link.service;

import com.example.backend.feature.link.exception.LinkNotFoundException;
import com.example.backend.feature.link.model.Link;
import com.example.backend.feature.link.repository.LinkRepository;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
public class LinkService {
    private final LinkRepository repository;

    public LinkService(LinkRepository repository) {
        this.repository = repository;
    }

    public Link get(@NotBlank String id) {
        return repository.findById(id).orElseThrow(LinkNotFoundException::new);
    }

    public Link create(@NotBlank @Size(max = 100) String name) {
        return repository.create(name);
    }

    public Link rename(@NotBlank String id, @NotBlank @Size(max = 100) String name) {
        return repository.rename(id, name);
    }
}
```

The schema rejects missing required fields, Bean Validation enforces API/application limits, and the domain constructor protects its nonblank invariant even outside Spring. Method validation requires invocation through the Spring proxy; direct unit construction does not test annotations. Trusted internal callers of this service do not automatically inherit controller authorization.

## API types and mapping

### `dto/LinkGql.java`

```java
package com.example.backend.feature.link.dto;

public record LinkGql(String id, String name) {}
```

### `dto/CreateLinkInput.java`

```java
package com.example.backend.feature.link.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateLinkInput(@NotBlank @Size(max = 100) String name) {}
```

### `dto/RenameLinkInput.java`

```java
package com.example.backend.feature.link.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameLinkInput(
        @NotBlank String id,
        @NotBlank @Size(max = 100) String name) {}
```

### `mapper/LinkMapper.java`

```java
package com.example.backend.feature.link.mapper;

import com.example.backend.feature.link.dto.LinkGql;
import com.example.backend.feature.link.model.Link;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
        unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface LinkMapper {
    LinkGql toGql(Link link);
}
```

MapStruct generates `LinkMapperImpl`; do not handwrite or edit it. A simple hand-mapping is also reasonable in a project without MapStruct. This example demonstrates the existing-tool convention, not a requirement to add a dependency for two fields.

## Controller and security

### `config/LinkSecurityConfig.java`

```java
package com.example.backend.feature.link.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
public class LinkSecurityConfig {}
```

### `controller/LinkController.java`

```java
package com.example.backend.feature.link.controller;

import com.example.backend.feature.link.dto.CreateLinkInput;
import com.example.backend.feature.link.dto.LinkGql;
import com.example.backend.feature.link.dto.RenameLinkInput;
import com.example.backend.feature.link.mapper.LinkMapper;
import com.example.backend.feature.link.service.LinkService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

@Controller
public class LinkController {
    private final LinkService service;
    private final LinkMapper mapper;

    public LinkController(LinkService service, LinkMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @QueryMapping
    @PreAuthorize("hasAuthority('link:read')")
    public LinkGql link(@Argument("id") @NotBlank String id) {
        return mapper.toGql(service.get(id));
    }

    @MutationMapping
    @PreAuthorize("hasAuthority('link:write')")
    public LinkGql createLink(@Argument("input") @Valid CreateLinkInput input) {
        return mapper.toGql(service.create(input.name()));
    }

    @MutationMapping
    @PreAuthorize("hasAuthority('link:write')")
    public LinkGql renameLink(@Argument("input") @Valid RenameLinkInput input) {
        return mapper.toGql(service.rename(input.id(), input.name()));
    }
}
```

## Error translation

### `handler/LinkApiExceptionResolver.java`

```java
package com.example.backend.feature.link.handler;

import com.example.backend.feature.link.exception.LinkNotFoundException;

import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class LinkApiExceptionResolver extends DataFetcherExceptionResolverAdapter {
    @Override
    protected GraphQLError resolveToSingleError(Throwable failure, DataFetchingEnvironment env) {
        if (failure instanceof LinkNotFoundException) {
            return GraphqlErrorBuilder.newError(env)
                    .errorType(ErrorType.NOT_FOUND)
                    .message("Link not found")
                    .extensions(java.util.Map.of("code", "LINK_NOT_FOUND"))
                    .build();
        }
        if (failure instanceof AccessDeniedException) {
            return GraphqlErrorBuilder.newError(env)
                    .errorType(ErrorType.FORBIDDEN)
                    .message("Access denied")
                    .extensions(java.util.Map.of("code", "ACCESS_DENIED"))
                    .build();
        }
        return null;
    }
}
```

In an existing application, reuse its central authentication/authorization resolver instead of repeating that branch in every feature. This resolver leaves validation and unexpected failures to the configured resolver chain. Configure any sanitized terminal fallback last; never return arbitrary exception messages to clients. See [exception handling](exception-handling.md) for validation, async wrappers, and subscription failures.

## Unit tests

### `repository/LinkRepositoryTest.java`

```java
package com.example.backend.feature.link.repository;

import com.example.backend.feature.link.exception.LinkNotFoundException;
import com.example.backend.feature.link.model.Link;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LinkRepositoryTest {
    @Test
    void renameReplacesStoredStateWithoutChangingPreviousSnapshot() {
        LinkRepository repository = new LinkRepository();
        Link original = repository.create("Before");

        Link renamed = repository.rename(original.id(), "After");

        assertThat(renamed).isEqualTo(new Link(original.id(), "After"));
        assertThat(repository.findById(original.id())).contains(renamed);
        assertThat(original.name()).isEqualTo("Before");
    }

    @Test
    void failedRenamePreservesStoredState() {
        LinkRepository repository = new LinkRepository();
        Link original = repository.create("Before");

        assertThatThrownBy(() -> repository.rename(original.id(), " "))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(repository.findById(original.id())).contains(original);
    }

    @Test
    void renamingMissingLinkDoesNotCreateIt() {
        LinkRepository repository = new LinkRepository();

        assertThatThrownBy(() -> repository.rename("missing", "After"))
                .isInstanceOf(LinkNotFoundException.class);

        assertThat(repository.findById("missing")).isEmpty();
    }
}
```

## GraphQL slice tests

### `controller/LinkControllerGraphQlTest.java`

```java
package com.example.backend.feature.link.controller;

import com.example.backend.feature.link.config.LinkSecurityConfig;
import com.example.backend.feature.link.handler.LinkApiExceptionResolver;
import com.example.backend.feature.link.mapper.LinkMapperImpl;
import com.example.backend.feature.link.repository.LinkRepository;
import com.example.backend.feature.link.service.LinkService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.graphql.test.autoconfigure.GraphQlTest;
import org.springframework.context.annotation.Import;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.graphql.test.tester.GraphQlTester;
import org.springframework.security.test.context.support.WithMockUser;
import static org.assertj.core.api.Assertions.assertThat;

@GraphQlTest(LinkController.class)
@Import({LinkService.class, LinkRepository.class, LinkMapperImpl.class,
        LinkSecurityConfig.class, LinkApiExceptionResolver.class})
class LinkControllerGraphQlTest {
    @Autowired
    private GraphQlTester graphQlTester;

    @Test
    @WithMockUser(authorities = {"link:read", "link:write"})
    void createRenameAndReadUseTheSameStoredState() {
        String id = createLink("Before");

        graphQlTester.document("""
                mutation($id: ID!) {
                  renameLink(input: {id: $id, name: "After"}) { id name }
                }
                """)
                .variable("id", id).execute()
                .path("renameLink.id").entity(String.class).isEqualTo(id)
                .path("renameLink.name").entity(String.class).isEqualTo("After");

        assertStoredName(id, "After");
    }

    @Test
    @WithMockUser(authorities = {"link:read", "link:write"})
    void invalidRenameDoesNotChangeStoredState() {
        String id = createLink("Before");

        graphQlTester.document("""
                mutation($id: ID!) {
                  renameLink(input: {id: $id, name: " "}) { id }
                }
                """)
                .variable("id", id).execute()
                .errors().satisfy(errors -> assertThat(errors).isNotEmpty());

        assertStoredName(id, "Before");
    }

    @Test
    @WithMockUser(authorities = "link:read")
    void readPermissionDoesNotGrantWritePermission() {
        graphQlTester.document("mutation { createLink(input: {name: \"Denied\"}) { id } }")
                .execute().errors()
                .satisfy(errors -> assertThat(errors).anySatisfy(error ->
                        assertThat(error.getErrorType()).isEqualTo(ErrorType.FORBIDDEN)));
    }

    @Test
    @WithMockUser(authorities = "link:read")
    void missingLinkHasStableNotFoundCode() {
        graphQlTester.document("query { link(id: \"missing\") { id } }")
                .execute().errors()
                .satisfy(errors -> assertThat(errors).anySatisfy(error ->
                        assertThat(error.getExtensions()).containsEntry("code", "LINK_NOT_FOUND")));
    }

    private String createLink(String name) {
        return graphQlTester.document("""
                mutation($name: String!) { createLink(input: {name: $name}) { id } }
                """)
                .variable("name", name).execute()
                .path("createLink.id").entity(String.class).get();
    }

    private void assertStoredName(String id, String expectedName) {
        graphQlTester.document("query($id: ID!) { link(id: $id) { name } }")
                .variable("id", id).execute()
                .path("link.name").entity(String.class).isEqualTo(expectedName);
    }
}
```

This slice executes the real service/repository/mapper and method-security proxies, but it does **not** exercise HTTP filters, JWT parsing, or WebSocket authentication. Its shared in-memory repository is safe here because each test creates its own UUID-based resource and no test assumes an empty global store. Add separate denied-anonymous and transport/security tests for the host's actual authentication setup.

## Adaptation

For Boot 3, use the [matching test imports](testing.md#boot-3-and-boot-4-compatibility). Durable storage needs a real migration/transaction/restart contract; the example's in-memory repository provides none. Remote commands and subscriptions require their own [completion](core-patterns.md#async-operation-pattern) and [stream](graphql-patterns.md#subscription-contract) contracts.

Compile generated mappings and run these tests in the host application using its [verification commands](testing.md#verification-commands-and-honest-reporting). The snippets are an adaptation example, not a standalone tested project.
