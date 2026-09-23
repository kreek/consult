# Data Models

Use this reference when picking how to shape REST API request and
response bodies. A data model standard provides vocabulary,
structural conventions, validation rules, and ecosystem tooling that
are expensive to re-invent.

## Rule

Preserve an existing service's representation. For a new REST resource API
with no established format, default to **JSON:API** unless a domain standard
or client interoperability need favors another documented choice. Document
the reason for that choice and any deviations from the chosen standard.

## JSON:API (new resource API default)

JSON:API (jsonapi.org) standardizes the resource envelope, error
shape, relationships, and pagination for REST APIs. It is the
default because it covers most resource-oriented APIs without
forcing decisions every team re-litigates:

- Resource envelope: `{ "data": { "id", "type", "attributes",
  "relationships" } }`.
- Sparse fieldsets via `?fields[type]=...` for clients that need
  smaller responses.
- Included resources via `?include=...` and the top-level `included`
  array, avoiding N+1 round trips for related data.
- Pagination via `links.next` / `links.prev` and `meta.page`.
- Errors as a top-level `errors` *array* (multiple errors per
  response). Each error object has `id` (occurrence-specific), `links`
  (with `about` and `type`), `status` (HTTP status as a *string*),
  `code` (application-specific code), `title` (stable per error type),
  `detail` (occurrence-specific), `source` (with `pointer`,
  `parameter`, or `header`), and `meta`.
- Compatible with OpenAPI: tools generate typed clients and mock
  servers from the schema.

Validators, code generators, and conformance test suites exist for
most languages. Adopt the standard fully; do not pick the envelope
without the relationship and error conventions.

## When to Switch

- **FHIR** (hl7.org/fhir) for clinical and healthcare data. Resources
  like `Patient`, `Observation`, `Condition`; strict schema, value
  sets, and jurisdictional profiles. Required for clinical-data
  interop. Use FHIR's native error shape (`OperationOutcome`).
- **HAL** when hypermedia navigation is a first-class concern: APIs
  where state transitions and discoverability via `_links` matter
  more than relationship modeling.
- **JSON-LD** when semantic-web or linked-data interop matters
  (search-engine consumption with schema.org vocabulary,
  cross-vocabulary integration, RDF compatibility).
- **Domain-specific standards** (FIBO for finance, OpenC2 for cyber
  response, etc.) when the domain has community validation, value
  sets, and tooling. Prefer them over inventing your own.

## Choosing

- **Existing contracts first.** Keep a service's established representation
  unless the change explicitly includes a migration.
- **Domain and client fit.** Healthcare → FHIR. Hypermedia navigation →
  HAL. Linked data → JSON-LD. For a new resource API with no established
  format, use JSON:API unless client interoperability needs favor another
  documented model.
- **Ecosystem and tooling.** Validators, code generators, IDE
  support, mock servers, and conformance test suites compound
  productivity.
- **No fit.** When nothing matches and JSON:API doesn't either,
  document the custom shape with the same rigor: schema, vocabulary,
  error contract, evolution rules, pagination conventions.

## Errors Within the Model

Preserve an existing service's error contract unless migration is in scope.
For a new API, use the chosen model's native error shape; do not mix or
hybridize:

- **JSON:API** → top-level `errors` *array* of error objects (fields
  above).
- **FHIR** → `OperationOutcome` resource with `issue[]` entries.
- **New plain JSON / custom API** → RFC 9457 Problem Details: a single
  top-level object with `type` (URI), `title`, `status` (integer),
  `detail`, and `instance` (URI).

These three are *structurally distinct conventions*, not interchangeable
field-name variants:

- JSON:API returns an array; Problem Details returns a single object
  (extensions can attach child fields, but the envelope is one).
- JSON:API's `status` is a string; Problem Details' is an integer.
- JSON:API's `code` is an application-specific string; Problem Details
  uses `type` (URI to a problem-type definition).
- JSON:API has `source.pointer`/`parameter`/`header` for locating the
  offending input; Problem Details has no standard analog.
- Problem Details has `instance` (URI for this occurrence); JSON:API
  has `id` (string for this occurrence).

Pick one shape per new API and apply it consistently. Preserve an established
error envelope in an existing API; change it through an explicit migration.
Translating between shapes at gateways or proxies requires a documented
mapping; consumer tooling cannot assume one shape decodes the other.

Mixing shapes within an API breaks consumer tooling.

## Half-Standards Are Worse Than No Standard

Adopting a standard then deviating silently produces tooling that
half-works:

- Document every deviation in the API reference.
- If the deviation is large enough that consumer tooling cannot bind,
  call the API "JSON:API-inspired" rather than claiming conformance.
- Add deviations to the contract reviewer's checklist so they are not
  hidden in PR diffs.

## Out of Scope

Non-REST API styles (gRPC/Protobuf, GraphQL, message-queue
contracts) have their own contract, error, and evolution conventions.
This skill and reference do not cover them; pick the relevant
ecosystem's conventions and use `architecture` for decisions about
style-of-API.
