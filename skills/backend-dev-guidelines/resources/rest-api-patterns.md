# REST API Patterns

Practical contracts for Spring MVC or WebFlux APIs. Start from the project's HTTP conventions, security policy, and error envelope, not a copied CRUD scaffold. Java fragments below require application service, DTO, mapper, and authorization implementations; they are not claims about existing endpoints.

## Table of Contents

- [Discover the stack and contract](#discover-the-stack-and-contract)
- [HTTP methods and resource semantics](#http-methods-and-resource-semantics)
- [Thin endpoint examples](#thin-endpoint-examples)
- [DTO and request validation](#dto-and-request-validation)
- [PUT, PATCH, and concurrent updates](#put-patch-and-concurrent-updates)
- [Bounded collections](#bounded-collections)
- [Security boundaries](#security-boundaries)
- [Clients, retries, and idempotency](#clients-retries-and-idempotency)
- [Errors and OpenAPI](#errors-and-openapi)
- [Verification and references](#verification-and-references)

## Discover the stack and contract

Inspect the POM/Gradle build, resolved Java/Boot/Framework versions, existing controllers, message converters, security chain, service return types, and tests. Determine MVC versus WebFlux and the installed client/OpenAPI support. Do not mix blocking MVC assumptions into reactive event loops or copy Boot 3 test/configuration imports into Boot 4 without checking their locations.

Follow existing resource paths, media types, JSON field naming, pagination, versioning, and compatibility policy. `/api/links` is illustrative; do not mandate `/api/v1` or introduce a second versioning scheme. When no REST implementation exists, say so and design only the requested endpoint. Neither JDBC nor OpenAPI dependencies establish an implemented API or durable operation store.

## HTTP methods and resource semantics

| Method/result | Contract |
| --- | --- |
| `GET /links/{id}` | Read without business side effects; `200` with representation, or the documented `404`/absence behavior. |
| `GET /links` | Bounded filtered collection; an empty result is normally `200` with an empty collection. |
| `POST /links` | Create: `201 Created` with a `Location` identifying the created resource, usually its representation. POST is not inherently idempotent. |
| `PUT /links/{id}` | Replace the client's writable representation; idempotent semantics. `200` with representation or `204` without; `201` only if creation at that URI is supported. |
| `PATCH /links/{id}` | Apply a documented partial-update format atomically. Not inherently idempotent; specify absence/null and retry behavior. |
| `DELETE /links/{id}` | Remove: often `204`; `200` with a result is also valid. Repeated deletion may return `404` or `204` by contract. Idempotence concerns resulting state, not identical response status. |
| `202 Accepted` | Admitted for later processing, not confirmed complete. Provide the designed monitoring contract; never fabricate completion. |
| `304 Not Modified` | Conditional GET matched the validator; no response body. |

Use nouns for resources and query parameters for filtering. A command that is not resource replacement can have a deliberate POST command endpoint; do not force every hardware/action workflow into fake CRUD. If a durable operation-status resource actually exists, `202` can identify it via `Location` and return its ID/state. That design needs ownership, terminal states, retention, recovery, and retry semantics. A `CompletableFuture` alone is not an operation-status resource and does not automatically imply `202`.

Use `400` for malformed/binding/input validation failures under the existing policy; `401` for missing/invalid authentication with the appropriate challenge, `403` for denied access, `404` for missing resources, `409` for state conflicts, `412` for failed request preconditions, `415` for unsupported content types, and `429` for enforced quotas. Use `422` only when the API deliberately distinguishes semantic invalidity. Dependency failures may be `502`, `503`, or `504` according to actual gateway/availability/timeout semantics, not an automatic conversion of every client exception.

## Thin endpoint examples

Inside an application `@RestController` mapped to `/api/links`, with constructor-injected service and mapper:

```java
@GetMapping("/{linkId}")
@PreAuthorize("hasAuthority('link:read')")
public LinkDto getLink(@PathVariable("linkId") String linkId) {
    return mapper.toDto(service.getLink(linkId));
}

@PostMapping
@PreAuthorize("hasAuthority('link:write')")
public ResponseEntity<LinkDto> createLink(
        @RequestBody @Valid CreateLinkRequest request) {
    var created = service.createLink(mapper.toCommand(request));
    URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{linkId}")
            .buildAndExpand(created.id())
            .toUri();
    return ResponseEntity.created(location).body(mapper.toDto(created));
}
```

Spring mappings/body/path annotations are from `org.springframework.web.bind.annotation`; `ResponseEntity` is from `org.springframework.http`, `URI` from `java.net`, and this MVC URI builder from `org.springframework.web.servlet.support`. `@Valid` is from `jakarta.validation`; `@PreAuthorize` is from `org.springframework.security.access.prepost`.

A DTO return is sufficient for ordinary `200` responses; use `ResponseEntity` when status/headers vary, or the project's existing response pattern. `@Controller` plus `@ResponseBody` and `ResponseEntity` return types can also work; do not claim only `@RestController` is functional. URI generation must respect trusted proxy configuration and external base paths; never trust arbitrary forwarded headers. WebFlux uses its own request/URI facilities rather than the MVC builder.

For an existing asynchronous service, preserve its type and map on completion:

```java
@PostMapping("/{linkId}/refresh")
@PreAuthorize("hasAuthority('link:write')")
public CompletableFuture<LinkDto> refreshLink(
        @PathVariable("linkId") String linkId) {
    return service.refreshLink(linkId).thenApply(mapper::toDto);
}
```

This example promises a refreshed representation only if the service completes after a real read. Do not call `.join()`, `.get()`, or `.block()` at the endpoint to hide asynchronous work. Admission, peer ACK, and freshly confirmed state remain different milestones; document which one completes the request. Request timeout/disconnect does not prove a side effect was cancelled or rolled back.

## DTO and request validation

Use dedicated writable request types; do not bind persistence entities or allow caller-controlled owner, tenant, authority, generated ID, or observed-state fields. Records are suitable when they match the project's Java/binding conventions.

```java
public record CreateLinkRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull LinkMode mode,
        @NotNull @Valid LinkSettingsRequest settings) {}

public record LinkSettingsRequest(@Min(1) @Max(100) int capacity) {}
```

`LinkMode` is an application enum. Strings use `@NotBlank`; required enums/objects use `@NotNull`; `@Valid` cascades but does not require presence. Optional numeric inputs should use boxed types when omission must not silently become zero. Size/range constraints generally permit null unless paired with a presence constraint.

Validate at each trust boundary:

- **Body:** `@RequestBody @Valid`, nested `@Valid`, non-null constraints, collection/element bounds, supported enum/value ranges, and cross-field rules. Specify unknown-field behavior where compatibility/security matters.
- **Path/query/header:** explicit binding names, format/range constraints and allowlisted sort/filter values. Body validation does not validate unrelated path/query parameters. Do not echo arbitrary invalid inputs in public errors.
- **Ownership/business rules:** the service checks the caller's resource scope, allowed transitions, and authoritative state. Annotation validation is not authorization, and controller-only validation does not protect other callers.
- **Storage/concurrency:** enforce uniqueness/consistency atomically at the actual store or synchronization boundary. An `exists` check followed by a write has a race; catching a specific known constraint conflict is not permission to expose SQL diagnostics.

MVC validation differs by Framework version and signature. Body binding commonly raises `MethodArgumentNotValidException`; Framework 6.1+ built-in method validation can raise `HandlerMethodValidationException` for direct parameter constraints. Class-level `@Validated` selects proxy-based validation instead; earlier versions need the supported proxy/configuration path. WebFlux uses its corresponding binding/validation exceptions. Confirm an installed validator, cover the actual paths, and distinguish invalid return values (server defects) from invalid input. See [Exception Handling](exception-handling.md#validation-and-framework-errors).

## PUT, PATCH, and concurrent updates

**PUT:** define the complete writable representation and replacement semantics. Do not accept a DTO with optional fields, ignore nulls in a mapper, and call that replacement. Server-owned fields remain protected; absence of a writable field must have a documented replacement/default/rejection meaning.

**PATCH:** select the project's existing patch format before implementing it:

- JSON Merge Patch (`application/merge-patch+json`): omitted properties are unchanged; null removes a property. Validate whether removal is legal; it cannot represent every explicit-null use case.
- JSON Patch (`application/json-patch+json`): validate allowed paths/operations and apply atomically to the caller's writable projection, then validate the resulting resource.
- A typed partial-update request: use supported presence tracking, an explicit field mask, or another established representation distinguishing omitted/null/value. A nullable record component or blind MapStruct null-ignore update normally cannot make that distinction.

Do not install a patch dependency or build a generic patch engine for a single endpoint without a real need. Validate every provided field and the final business state; reject clearing non-null fields and protected-field changes. Test omission, explicit null, unknown fields, invalid nested updates, and atomic failure.

When lost updates matter, use the existing optimistic concurrency mechanism: expose a representation version/ETag and require `If-Match` for writes, checking it atomically with the update. A stale conditional write is `412`; use `428` if the published contract requires a missing precondition to be rejected. `If-None-Match` supports conditional reads and `304`. ETags must describe the actual authorized representation; cache policy must not expose private state. Do not add a versioning scheme if the resource has no concurrent-update requirement.

## Bounded collections

- Enforce page/count minimums and a server maximum; examples might default to 20 and cap at 100, but select domain-appropriate limits. Validate in the service as well when non-HTTP callers exist.
- Use existing pagination DTOs/headers. Do not leak a persistence framework's page serialization as a stable external contract by accident.
- Specify stable ordering with a unique tie-breaker, supported sorts, total-count cost, and empty-page behavior. Prefer cursor/keyset pagination for large or rapidly changing sets when the actual store supports it.
- Bound filter lengths, batch input counts, nested expansions, response sizes, and upstream concurrency. Never materialize the full dataset merely to paginate it in the controller.

## Security boundaries

Define public/authenticated/authority/ownership policy for each endpoint. Keep a restrictive HTTP fallback and explicitly enumerate public routes; do not use global `permitAll` or wildcard CORS as a reusable default.

- Enable method authorization with `@EnableMethodSecurity` (`org.springframework.security.config.annotation.method.configuration`) for the imperative `@PreAuthorize` examples. A security starter alone does not activate it. Reactive services need the corresponding reactive configuration/context.
- `link:read` and `link:write` are illustrative granted authorities. Authority checks do not prove ownership; enforce tenant/resource access in the shared service before reading or mutating. Prevent bypass through other controllers/jobs/service callers according to policy, and account for proxy self-invocation.
- For JWT authentication, use the established verifier with trusted keys and allowed algorithms; validate issuer, intended audience, expiry, and not-before as required by the token contract. Decoding claims is not verification. Never derive trusted identity or authorities from an unverified token; test invalid signatures and wrong issuer/audience as well as expiry.
- **Cookie/session or other ambient browser credentials:** retain appropriate CSRF protection for state changes and secure cookie/session settings. A stateless server can still be CSRF-vulnerable if the browser supplies credentials automatically.
- **Explicit bearer-only API:** disabling CSRF may be appropriate for a narrowly scoped chain only after confirming credentials are not automatically attached by the browser. JWTs in cookies do not automatically qualify. Do not copy a global CSRF disable into mixed session/bearer applications.
- CORS controls browser cross-origin access, not caller authorization. Allow intended origins/methods/headers and credentials only where needed; handle preflight in the established security integration. WebSocket origins/authentication are a separate policy.
- Keep authentication failures and access denial in the established security entry point/denied-handler path. A generic advice must not turn them into `500` or an HTTP `200` success envelope.

## Clients, retries, and idempotency

Reuse the installed HTTP client abstraction. On an imperative stack, `RestClient` is available from Spring Framework 6.1+; older versions may use an existing `RestTemplate` or another client. Use `WebClient` for an existing reactive/non-blocking path when WebFlux client support is available; Reactor Core or a WebSocket dependency alone does not establish that client. Do not add a dependency just to match a documentation snippet.

Set bounded connect/read/overall deadlines, connection/concurrency limits, and safe error decoding using the actual client API. Do not block a reactive event loop or log authorization headers/request bodies. Bound response bodies and validate destinations if user input can influence upstream URLs.

Retry only failures and operations known to be safe under the upstream contract. Use an overall deadline, capped attempts, backoff/jitter, and `Retry-After` where appropriate. A timeout after sending a POST/device command has an **unknown outcome**; it is not evidence that replay is safe. Even nominally idempotent updates can have non-idempotent physical side effects.

If idempotency keys are actually required, scope them to caller/operation, bind them to a request fingerprint, reserve/process atomically, define concurrent duplicates and expiry, and retain/replay the result under the intended durability guarantees. A header or in-memory map alone does not give exactly-once execution. Never automatically retry unsafe commands just because a client library supports retries.

## Errors and OpenAPI

Preserve the existing public error envelope and stable codes. For a new API without one, Spring's `ProblemDetail` is a reasonable RFC 9457 contract; migrating an existing API to it is a separate compatibility decision. Typed advice, validation, security errors, and unknown fallback behavior belong in [Exception Handling](exception-handling.md), not duplicated catch blocks in every controller.

When compatible OpenAPI support is installed, document real success/error bodies, media types, authentication/authorities, validation bounds, pagination, `Location`, conditional headers, and async completion semantics. An OpenAPI security declaration documents policy; it does not enforce it. For the retrieval fragment, add annotations from `io.swagger.v3.oas.annotations`/`.responses` to that same method:

```java
@Operation(summary = "Read a link", description = "Requires link:read and resource access")
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "Current authorized representation"),
    @ApiResponse(responseCode = "401", description = "Authentication required"),
    @ApiResponse(responseCode = "403", description = "Access denied"),
    @ApiResponse(responseCode = "404", description = "Link not found")
})
```

Adapt `403`/`404` disclosure behavior to the actual ownership policy. Reference the real schemas/security scheme in generated docs rather than claiming annotations create them. Check the Springdoc major against Boot; never add configuration beans merely to fill a template.

Example creation contract for a protected API (credential value deliberately omitted):

```http
POST /api/links HTTP/1.1
Content-Type: application/json
Authorization: Bearer <access-token>

{"name":"uplink","mode":"ACTIVE","settings":{"capacity":10}}
```

```http
HTTP/1.1 201 Created
Location: /api/links/link-42
Content-Type: application/json

{"id":"link-42","name":"uplink","mode":"ACTIVE"}
```

## Verification and references

Test the actual MVC/WebFlux transport with its security filters, not only direct controller calls:

- Happy path, encoded `Location` and proxy/base-path behavior, media types, status/headers/body, and empty/no-content responses.
- Malformed body, enum/type mismatch, nested/path/query validation, pagination bounds, and forbidden writable fields.
- Anonymous, wrong authority, wrong owner/tenant, CSRF/session and bearer behavior, CORS preflight, and alternate service callers.
- PUT replacement, PATCH absent/null/value, atomic rejection, duplicate creation race, and stale conditional writes where supported.
- Async exception/timeout/disconnect, safe error contract, and retry/idempotency behavior including unknown command outcome.
- Generated OpenAPI against runtime behavior. See [Testing](testing.md), [DTO and Mapping](dto-and-mapping.md), and [Complete Examples](complete-examples.md).

Version-matched references: [Spring MVC controllers](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller.html), [MVC validation](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html), [REST clients](https://docs.spring.io/spring-framework/reference/integration/rest-clients.html), [Spring Security CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html), and [HTTP semantics (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110).
