---
name: api
description: "Use for REST API contracts: endpoints, fields, evolution, status codes, errors, pagination, idempotency."
---

# API

## Iron Law

`DESIGN THE CONTRACT FIRST. EVOLVE WITHOUT BREAKING. PICK STATUS BY ORIGIN.`

## When to Use

- Adding, removing, renaming, or reviewing REST endpoints, fields,
  status codes, webhooks, auth, pagination, rate limits, or
  idempotency.
- Writing or changing OpenAPI, JSON Schema, public SDK boundaries, or
  integration contracts external callers depend on.

## When NOT to Use

- Internal function signatures with no caller contract; use
  `domain-modeling` or `refactoring`.
- Auth, secrets, or trust-boundary review beyond API shape; use
  `security`.
- Database schema design; use `database`.
- Non-REST API styles (gRPC, GraphQL, message queues): contract,
  error, and evolution conventions differ; use `architecture` for
  style-of-API decisions and the relevant ecosystem's conventions for
  shape.

## Core Ideas

1. **Contract first.** Sketch OpenAPI or the repo's API contract source
   before controller code; implement *from* the contract, not toward it.
   Every response shape is explicit, including errors, empty states,
   pagination, and auth failures. Durable API interfaces route through
   `contract-first`; error shape is part of the contract.
2. **Evolution: additive in place; breaking needs a path forward.**
   Optional fields, query params, headers, methods, and endpoints
   evolve in place. Renames, removals, required additions, status-code
   changes, and semantic changes need a successor contract or
   deprecation path. Never break in place. See
   `references/api-evolution.md`.
3. **Versioning: one strategy per service.** Pick URL path, media
   type, header, or date and apply it consistently. Major bumps for
   breaking changes only; compatible additions never re-version.
   Retire versions with an overlap window; route deprecation
   primitives through `release`. See `references/api-evolution.md`.
4. **Errors: status by origin, shape by contract.** `4xx` for
   consumer-request problems, `5xx` for upstream or your-service
   problems; never mix origins in one response. Use the chosen data
   model's native error shape (JSON:API `errors[]`, FHIR
   `OperationOutcome`, or RFC 9457 Problem Details). These are
   structurally distinct conventions, not interchangeable. Never leak
   raw upstream or internal errors. See
   `references/rest-error-status-codes.md`.
5. **Default to JSON:API; switch only when the domain has its own
   standard.** JSON:API is the default for REST resource APIs (envelope
   with `id`/`type`/`attributes`/`relationships`, sparse fieldsets,
   includes, pagination conventions, error array). Switch to a
   domain-specific standard when one applies: FHIR for healthcare,
   HAL for hypermedia-centric APIs, JSON-LD when semantic-web interop
   matters. Document deviations from the chosen standard explicitly.
   See `references/data-models.md`.

## Workflow

1. Identify the caller and the contract surface they bind to.
2. Define the contract before implementation: path, method, request body,
   response bodies, status codes, auth, pagination, idempotency, and error
   shape.
3. Route durable API interfaces through `contract-first` before controller,
   client, SDK, webhook, or integration work continues. Additive changes old
   callers cannot notice (a new optional field, param, or endpoint) proceed
   without a stop; state the shape in the close-out.
4. Apply the relevant reference only when the feature needs it:
   `api-evolution`, `rest-error-status-codes`, `idempotency`, `pagination`,
   `webhooks`, or `middleware-vs-handler`.
5. Add outer-boundary contract or behavior tests. Update source-of-truth docs,
   not generated output by hand.

## Verification

- [ ] Contract exists or is updated before implementation lands.
- [ ] Durable API interfaces have explicit user approval before implementation
      continues, or the change is additive and its shape is stated in the
      close-out.
- [ ] Every endpoint documents request, auth, responses by status, and errors.
- [ ] Request, response, and error shapes follow the chosen data model
      consistently; status codes are selected by origin and do not leak internal
      or upstream details.
- [ ] Non-idempotent mutations define idempotency key scope, replay window,
      duplicate response, and conflict semantics, or are documented as unsafe to
      retry.
- [ ] Lists and streams have bounded pagination, stable ordering, and explicit
      invalid-token behavior; bad tokens do not silently restart, rewind, or
      skip position.
- [ ] Additive changes are optional and old callers still work; incompatible
      changes have a successor contract or deprecation path with overlap and
      migration guidance.
- [ ] Webhooks are signed, timestamped, replay-protected, and
      deduplicable.
- [ ] Middleware is limited to transport-wide request-pipeline
      concerns; endpoint-specific validation, ownership checks,
      privileged authorisation, and domain invariants stay at the
      route/domain boundary.
- [ ] Tests exercise the public boundary; unproven public contract claims are
      reported.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Renaming this field is harmless" | Treat field renames and removals as breaking unless a successor contract or deprecation path exists. | The field never shipped to any caller. |
| "Any error can be a 400 (or a 500)" | Pick status by origin: consumer problems are `4xx`; service/upstream problems are `5xx`. | None. |
| "Return whatever the handler has" | Define response and error shape in the contract before returning handler internals. | None. |
| "The list is small, skip pagination" | Define bounded pagination, stable ordering, and invalid-token behavior before the endpoint can grow. | The collection is provably bounded, such as an enum-sized set. |
| "Callers can just retry the mutation" | Define idempotency key scope, replay window, duplicate response, and conflict semantics first, or document the mutation as unsafe to retry. | The mutation is naturally idempotent and documented as such. |
| "It's just an outgoing webhook" | Sign, timestamp, replay-protect, version, and deduplicate external webhooks. | Delivery stays inside one trust boundary. |
| "Put the check in middleware so it's global" | Keep route-specific validation, ownership, and domain rules in handler/domain code; use middleware for transport-wide concerns. | The concern is genuinely transport-wide, such as logging, tracing, or rate limits. |

## Handoffs

- `contract-first`: durable API approval.
- `proof`: prove at the request → handler and handler → response handoffs;
  status codes, error envelopes, and pagination contracts are asserted at
  those seams.
- `error-handling`: internal failure mapping, remote-call timeouts, retries,
  budgets, and circuit breakers behind the API.
- `security`: authn/authz, input trust, SSRF, secrets, and data exposure.
- `architecture`: middleware placement and API style decisions.
- `async-systems`: SSE, subscriptions, event streams, async consumers, delivery.
- `release`: version bumps, changelog, `Sunset`, and `Deprecation` primitives.
- `documentation`: API docs location; generated contract reference stays source
  of truth.

## References

- `references/api-evolution.md`: evolution rules and versioning
  strategies.
- `references/rest-error-status-codes.md`: status-by-origin decision
  tree.
- `references/data-models.md`: JSON:API as the REST default; FHIR,
  HAL, JSON-LD when the domain calls for them.
- `references/idempotency.md`: idempotency-key contract.
- `references/pagination.md`: cursor and bounded-pagination semantics.
- `references/webhooks.md`: signing, versioning, replay protection.
- `references/middleware-vs-handler.md`: request-pipeline placement.
- `../security/references/web-app.md`: CSRF middleware, security
  headers, and CORS.
- `../security/references/api-and-auth.md`: handler-level
  authorisation caveats for privileged endpoints.
