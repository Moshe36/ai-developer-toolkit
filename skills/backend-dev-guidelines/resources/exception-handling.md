# Exception Handling

Translate failures at the boundary that owns the public contract. Preserve causes internally, expose stable safe codes externally, and let independent handlers compose. Examples are illustrative fragments requiring the application's exception types and policy; do not add a universal exception hierarchy to use them.

## Table of Contents

- [Choose the failure model](#choose-the-failure-model)
- [Public error contract](#public-error-contract)
- [REST advice](#rest-advice)
- [Validation and framework errors](#validation-and-framework-errors)
- [GraphQL error phases](#graphql-error-phases)
- [Composable data-fetch resolver](#composable-data-fetch-resolver)
- [Subscription publisher errors](#subscription-publisher-errors)
- [Asynchronous failures and cancellation](#asynchronous-failures-and-cancellation)
- [Logging and diagnostics](#logging-and-diagnostics)
- [Verification and references](#verification-and-references)

## Choose the failure model

Inspect existing exceptions, resolver/advice order, client adapters, validation/security infrastructure, and the resolved Java/Boot/Framework/Spring GraphQL versions before adding handlers. Boot 3/4 imports and exception APIs can differ; use `jakarta.validation` and version-matched documentation rather than assuming every Boot release shares one method signature.

| Failure | Ownership and handling |
| --- | --- |
| Invalid transport input | Binding/validation boundary; return the established safe input-error contract. |
| Expected domain rejection | Existing domain exception/result, such as busy resource or illegal transition; map intentionally at each transport. |
| Missing domain resource | Existing typed missing-resource exception, or normal optional absence where the contract permits it. |
| Authentication/access denial | Spring Security's established security path; preserve unauthenticated versus forbidden semantics. |
| Dependency failure | Adapter translates specific client/protocol failures only when it adds meaning, retaining cause. |
| Unexpected defect | Propagate to final boundary fallback; opaque public error, correlated internal diagnostic. |
| Cancellation/disconnect | Lifecycle signal, not automatically a domain failure or server defect. |

Reuse a domain-specific exception when callers distinguish that condition. Do not treat every `NoSuchElementException` as a missing API resource or every `IllegalArgumentException` as invalid user input: either can indicate a programming defect. Do not invent a base class and many subclasses for hypothetical errors. A structured domain result can be appropriate for routine alternatives; preserve the project's established model.

Keep services transport-neutral: no `ResponseEntity`, HTTP status, or `GraphQLError` just to report domain failure. Enforce invariants in the service even when controllers validate; other entry points must not bypass them. A domain conflict requires an atomic authoritative check, not a racy controller `exists` preflight.

## Public error contract

- Preserve existing envelopes and machine-readable codes; changing them is an API compatibility decision. Map the same domain condition consistently across transports without forcing identical wire formats.
- Codes such as `LINK_NOT_FOUND`, `LINK_BUSY`, `VALIDATION_FAILED`, and `INTERNAL_ERROR` are illustrative, stable categories. Clients branch on documented codes, not English messages or exception class names.
- Only publish messages deliberately authored for callers. Never copy arbitrary `ex.getMessage()`, stack traces, SQL, upstream URLs/bodies, hostnames, command payloads, or configuration into responses.
- Include a safe correlation/execution ID when supported. Do not expose a caller-controlled request ID without length/format validation, or invent an unbacked trace ID that cannot be found in diagnostics.
- Validation details should be bounded lists of safe field/path/code/message entries. Do not return rejected values; paths can themselves contain attacker-controlled keys and need normalization/limits. Allowlist messages when custom validators interpolate data.
- Retriable/unavailable does not mean safe to repeat a side effect. A command timeout can have an unknown outcome; never claim it failed before execution without evidence.

For new REST contracts, `ProblemDetail` from `org.springframework.http` supports RFC 9457 with stable extensions. Existing APIs may already have a different valid envelope; do not migrate them incidentally. GraphQL uses its `errors` list and safe `extensions.code`, potentially alongside partial `data`.

## REST advice

Use typed `@ExceptionHandler` methods in the project's existing `@RestControllerAdvice`, scoped to REST controllers where appropriate. Example for a **new ProblemDetail-based API** using an application `LinkNotFoundException`:

```java
@ExceptionHandler(LinkNotFoundException.class)
public ResponseEntity<ProblemDetail> handleLinkNotFound(
        LinkNotFoundException exception) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND, "Link not found");
    problem.setTitle("Link not found");
    problem.setProperty("code", "LINK_NOT_FOUND");
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
}
```

Imports: `org.springframework.web.bind.annotation.ExceptionHandler`/`RestControllerAdvice`, and `org.springframework.http.HttpStatus`/`ProblemDetail`/`ResponseEntity`. Adapt the body to an existing envelope instead of introducing a second one. A stable problem `type` URI may be supplied by the application's published problem catalog; do not invent a non-existent catalog in a snippet.

Map only known conditions: domain-state conflicts commonly use `409`; failed `If-Match` uses `412`; transient unavailability can use `503` if accurate. Translate specific storage constraint failures only when they correspond to a known public conflict. Do not convert every database/client/runtime exception to a client error.

Prefer existing framework handling for malformed JSON, unsupported media type, missing parameters, and method mismatch, customizing it through the version-appropriate `ResponseEntityExceptionHandler` path when needed. A broad catch-all advice can accidentally override those statuses or another advice's specific handling. If an unknown-error fallback is required, deliberately order it last, preserve framework/security errors, return opaque `500`, and log once. Never catch `Throwable` or convert a JVM `Error` to a normal business response.

Authentication failures occurring in filters need the existing `AuthenticationEntryPoint`; authorization denials need the established denied-handler/security integration. Advice does not automatically cover filter failures. Keep `401`/challenge and `403` semantics, and do not swallow security exceptions with a generic success/error envelope. Once a response is committed or streaming has started, advice cannot reliably replace its status/body; use the transport's streaming error/termination contract.

## Validation and framework errors

`@Valid` activates cascaded validation on a supported invocation path; it does not specify the public error shape. Ensure a validator is configured and normalize known binding/validation failures consistently without publishing rejected values.

| Path | Check against the resolved framework |
| --- | --- |
| MVC request body/object validation | Commonly `MethodArgumentNotValidException`. |
| MVC direct parameter constraints | Framework 6.1+ built-in validation can raise `HandlerMethodValidationException`; distinguish input validation from return-value defects. |
| Proxy-based method validation | Class-level `@Validated` and configured method validation may raise `ConstraintViolationException` or adapted method-validation exceptions. Do not assume every violation originated from the caller. |
| WebFlux binding | Uses reactive-stack exceptions such as `WebExchangeBindException`; do not paste MVC-only handlers. |
| GraphQL SDL/coercion | Rejected before field execution; not handled by a data-fetch exception resolver. |
| GraphQL argument binding/Bean Validation | Can raise `BindException`/`ConstraintViolationException` depending on binding and invocation; map known input failures explicitly. |

Do not add class-level `@Validated` blindly to a modern MVC controller: it changes the proxy-versus-built-in validation path. Support both applicable body and parameter validation cases in the current version. If extending `ResponseEntityExceptionHandler`, check exact override signatures and avoid competing annotation handlers for the same exceptions.

Bound the number of violations returned and retain multiple errors per field when useful; a `Map<String,String>` silently overwrites duplicates and cannot represent global/cross-field errors well. Test missing nested objects, invalid enums/scalars, path/query bounds, collection elements, and a return-value validation defect that must not become `400`.

## GraphQL error phases

| Phase | Correct integration |
| --- | --- |
| Parse/SDL validation/coercion | GraphQL Java request errors; customize through established request/transport hooks if necessary, not a data-fetch resolver. |
| Fetching a query/mutation field or creating a subscription publisher | Ordered `DataFetcherExceptionResolver` chain, or supported `@GraphQlExceptionHandler` in controllers/advice. |
| Mapping a field of an individual subscription event | Data-fetch handling for that execution result; may produce partial data/errors according to nullability. |
| Subscription publisher emits terminal `onError` | `SubscriptionExceptionResolver`/transport integration, separate from initial data fetching. |
| WebSocket handshake/connection-init authentication | Transport/security interceptor path, not field-error advice. |

GraphQL HTTP success status does not mean every field succeeded. Preserve field path/location using the provided `DataFetchingEnvironment`; aliases may appear in paths. Non-null failures bubble through the schema. Publisher terminal errors terminate the operation and are not ordinary data events; the exact error-frame shape depends on transport/protocol. Do not fabricate a per-event field path for a failure that has no field environment.

## Composable data-fetch resolver

Resolve only known domain conditions and leave others for subsequent resolvers. Example application component:

```java
@Component
public class LinkGraphQlExceptionResolver
        extends DataFetcherExceptionResolverAdapter {

    @Override
    protected GraphQLError resolveToSingleError(
            Throwable exception, DataFetchingEnvironment environment) {
        Throwable failure = unwrapAsyncFailure(exception);
        if (failure instanceof LinkNotFoundException) {
            return GraphqlErrorBuilder.newError(environment)
                    .errorType(ErrorType.NOT_FOUND)
                    .message("Link not found")
                    .extensions(Map.of("code", "LINK_NOT_FOUND"))
                    .build();
        }
        return null;
    }
}
```

Imports: `graphql.GraphQLError`, `graphql.GraphqlErrorBuilder`, `graphql.schema.DataFetchingEnvironment`, `org.springframework.graphql.execution.DataFetcherExceptionResolverAdapter`/`ErrorType`, `org.springframework.stereotype.Component`, and `java.util.Map`. `unwrapAsyncFailure` is the helper below, not a Spring API; place/reuse it in the existing handler utility only when wrapper handling is needed.

Returning **null** from this adapter's protected method means unresolved: later resolvers can inspect the exception. In the lower-level asynchronous resolver contract, an emitted empty error list means **resolved with no errors**, not unresolved; do not confuse it with an empty publisher. Suppressing an exception deliberately can also cause non-null bubbling later.

Avoid a catch-all `INTERNAL_ERROR` in every feature resolver: it masks security/validation/other feature resolvers. Use existing `@Order`/ordering conventions for known handlers and test cross-resolver behavior. Unknowns can use Spring GraphQL's opaque internal-error fallback with execution ID. If the public contract requires a custom stable fallback code, install one deliberate terminal resolver after all specific resolvers; ensure it also preserves the intended security classification.

When using supported `@GraphQlExceptionHandler`, confirm its version, advice scope, and how non-controller data fetchers are integrated. Do not register duplicate handlers/resolvers for the same condition without an intentional order.

## Subscription publisher errors

For versions exposing `org.springframework.graphql.execution.SubscriptionExceptionResolverAdapter`, a separate component can map a known publisher failure:

```java
@Override
protected GraphQLError resolveToSingleError(Throwable exception) {
    Throwable failure = unwrapAsyncFailure(exception);
    if (failure instanceof LinkWatchUnavailableException) {
        return GraphqlErrorBuilder.newError()
                .errorType(ErrorType.INTERNAL_ERROR)
                .message("Link updates are temporarily unavailable")
                .extensions(Map.of("code", "LINK_WATCH_UNAVAILABLE"))
                .build();
    }
    return null;
}
```

This is a method fragment of that adapter, not an override on `DataFetcherExceptionResolverAdapter`. Verify adapter availability/signature and Boot registration for the resolved Spring GraphQL version; use its supported interface/configuration when different. Keep unknown exceptions unresolved for the intended fallback, whose safe behavior must be tested separately for subscriptions.

Use publisher recovery only when it preserves semantics. `onErrorResume` to an empty stream silently makes failure look like successful completion; replacing failure with cached state can lie about freshness. Reconnect with bounded policy and gap recovery only when the source supports it. A terminated sink cannot be revived by later emissions. Release listeners/timers on cancellation, completion, and error via a non-throwing lifecycle adapter; never lose the original error to cleanup. See [GraphQL lifecycle guidance](graphql-patterns.md#demand-emissions-and-cleanup).

## Asynchronous failures and cancellation

Preserve exceptional completion: use `thenApply`/`thenCompose` for transformations, not `exceptionally` returning null or a fabricated success. When translating a known client exception at an adapter, pass the original cause into the existing domain/integration exception constructor. Do not log-and-rethrow at every layer.

For classification, unwrap only known transparent async wrappers, not every cause down to the deepest exception:

```java
private static Throwable unwrapAsyncFailure(Throwable failure) {
    while (isAsyncWrapper(failure) && failure.getCause() != null) {
        failure = failure.getCause();
    }
    return failure;
}

private static boolean isAsyncWrapper(Throwable failure) {
    return failure instanceof CompletionException
            || failure instanceof ExecutionException;
}
```

Both wrapper types are from `java.util.concurrent`. Keep the original exception for diagnostics; this helper selects a classification cause without destroying the chain. Do not strip a meaningful domain wrapper merely because its cause is an I/O failure. Use a library's supported unwrapping utility for its own wrappers only if already available and semantically appropriate.

Treat `CancellationException`, Reactor cancellation, and client disconnects according to lifecycle policy, not as unexpected `500` incidents. Cancellation may release a listener while an already-sent device command continues; a future timeout does not guarantee upstream cancellation. If a blocking integration catches `InterruptedException`, restore the interrupt flag and propagate/translate appropriately rather than continuing or retrying. Do not catch fatal errors for normalization.

## Logging and diagnostics

- Log a failure once at the boundary responsible for diagnosing it. Expected validation/not-found/domain rejection normally needs no stack trace and may need only debug/metrics. Repeated access denials belong in the established rate-controlled audit/security path, not noisy error logs.
- Unexpected defects generally need one error diagnostic with safe correlation ID and useful stack/cause information. Dependency incidents can be warning/error according to impact and recovery. Avoid duplicate service, advice, resolver, and framework stack traces; know the framework's existing unresolved-error logging.
- Stack traces can contain unsafe exception messages. Apply the project's redaction policy before logging client/driver exceptions; never log tokens, passwords, authorization headers, secrets, full configuration, sensitive payloads, or raw request documents by default.
- Use existing structured fields for operation/category/outcome/duration and safe scoped identifiers. Validate/truncate caller-controlled strings to prevent log injection and unbounded diagnostics. Do not dump whole DTOs or environment/configuration objects.
- Use existing metrics with low-cardinality labels such as stable error code and operation category. Never label metrics with exception messages, user/resource IDs, arbitrary GraphQL operation names, or correlation IDs. Do not introduce an observability dependency for a handler change.
- Preserve security audit requirements separately from routine diagnostics. Cleanup failures must be recorded safely without throwing from `doFinally` or masking the primary failure.

## Verification and references

- Test every known error mapping and an unknown exception with an internal-only message; verify that no message/cause/secret leaks into the public body.
- Prove resolver composition: an earlier domain resolver returns unresolved for another feature's failure; a later resolver handles it; only the terminal fallback handles unknowns.
- Exercise wrapped async failure, cancellation, timeout, and cause retention. Test the unknown-outcome contract rather than assuming rollback.
- Test REST malformed/binding/body/path/query errors through the actual framework and preserve security status/challenges. Test response-committed/streaming behavior where applicable.
- Test GraphQL request errors, partial data/non-null bubbling, subscription setup failure, per-event field failure, and publisher terminal errors separately. Verify transport frames and cleanup on real cancellation.
- Check bounded validation details, once-only logging, redaction, and low-cardinality metrics using existing infrastructure. See [Testing](testing.md), [REST patterns](rest-api-patterns.md), [GraphQL patterns](graphql-patterns.md), and [Complete Examples](complete-examples.md).

Version-matched references: [Spring GraphQL exceptions](https://docs.spring.io/spring-graphql/reference/request-execution.html#execution.exceptions), [GraphQL annotated exception handling](https://docs.spring.io/spring-graphql/reference/controllers.html#controllers.exception-handler), [MVC error responses](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html), [MVC validation](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html), and [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457).
