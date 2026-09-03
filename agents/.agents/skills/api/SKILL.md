---
name: api
description: "Use for REST API contracts: endpoints, fields, evolution, status codes, errors, pagination, idempotency."
---

# API

## Iron Law

`DESIGN THE CONTRACT FIRST. EVOLVE WITHOUT BREAKING. PICK STATUS BY ORIGIN.`

## When to Use

- Adding, removing, renaming, or reviewing REST endpoints, fields, status
  codes, webhooks, auth, pagination, rate limits, or idempotency.
- Writing or changing OpenAPI, JSON Schema, public SDK boundaries, or
  integration contracts external callers depend on.

## When NOT to Use

- Internal function signatures with no caller contract; use `domain-modeling`.
- Auth, secrets, or trust-boundary review beyond API shape; use `security`.
- Database schema; use `database`.
- gRPC, GraphQL, or message-queue APIs: use `architecture` for the style
  decision and that ecosystem's conventions for shape.

## Rules

1. Sketch the contract (OpenAPI or the repo's contract source) before
   controller code and implement from it. Every response shape is explicit,
   including errors, empty states, pagination, and auth failures. Durable
   API interfaces route through `contract-first`. Additive changes old callers
   cannot notice (a new optional field, param, or endpoint) proceed without a
   stop; state the shape in the close-out.
2. Never break in place. Optional fields, params, headers, methods, and
   endpoints evolve in place. Renames, removals, required additions,
   status-code changes, and semantic changes need a successor contract or a
   deprecation path with an overlap window. One versioning strategy per
   service, applied consistently; compatible additions never re-version.
3. Status by origin: `4xx` for consumer-request problems, `5xx` for upstream
   or your-service problems. Never mix origins in one response. Never leak raw
   upstream or internal errors.
4. Default to JSON:API for REST resource APIs. Switch only when the domain has
   its own standard (FHIR for healthcare, HAL for hypermedia, JSON-LD for
   semantic-web interop). The chosen model's native error shape is the error
   contract; these conventions are not interchangeable. Document deviations.
5. Non-idempotent mutations define idempotency key scope, replay window,
   duplicate response, and conflict semantics, or are documented as unsafe to
   retry.
6. Lists have bounded pagination, stable ordering, and explicit invalid-token
   behavior. A bad token never silently restarts, rewinds, or skips position.
7. External webhooks are signed, timestamped, replay-protected, versioned, and
   deduplicable.
8. Middleware is for transport-wide concerns (logging, tracing, rate limits).
   Endpoint-specific validation, ownership checks, privileged authorization,
   and domain invariants stay at the route or domain boundary.
9. Tests exercise the public boundary. Source-of-truth docs are updated, not
   generated output by hand.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Renaming this field is harmless" | Treat renames and removals as breaking unless a successor contract or deprecation path exists. | The field never shipped to any caller. |
| "Any error can be a 400 (or a 500)" | Pick status by origin. | None. |
| "Return whatever the handler has" | Define response and error shape in the contract first. | None. |
| "The list is small, skip pagination" | Define bounded pagination and invalid-token behavior before the endpoint can grow. | The collection is provably bounded, such as an enum-sized set. |
| "Callers can just retry the mutation" | Define the idempotency contract first, or document the mutation as unsafe to retry. | The mutation is naturally idempotent and documented as such. |
| "It's just an outgoing webhook" | Sign, timestamp, replay-protect, version, and deduplicate. | Delivery stays inside one trust boundary. |
| "Put the check in middleware so it's global" | Keep route-specific validation, ownership, and domain rules in handler or domain code. | The concern is genuinely transport-wide. |

## Handoffs

- `contract-first`: durable API approval.
- `proof`: assert status codes, error envelopes, and pagination at the
  request-to-handler and handler-to-response seams.
- `error-handling`: internal failure mapping, timeouts, retries behind the API.
- `security`: authn/authz, input trust, SSRF, data exposure.
- `async-systems`: SSE, subscriptions, event streams.
- `release`: version bumps, `Sunset` and `Deprecation` primitives.

## References

Load only the one the feature needs:

- `references/api-evolution.md`: evolution rules and versioning strategies.
- `references/rest-error-status-codes.md`: status-by-origin decision tree.
- `references/data-models.md`: JSON:API default; FHIR, HAL, JSON-LD.
- `references/idempotency.md`: idempotency-key contract.
- `references/pagination.md`: cursor and bounded-pagination semantics.
- `references/webhooks.md`: signing, versioning, replay protection.
- `references/middleware-vs-handler.md`: request-pipeline placement.
- `../security/references/web-app.md`: CSRF middleware, security headers, CORS.
- `../security/references/api-and-auth.md`: handler-level authorization for
  privileged endpoints.
