# Scenario Title
PATCH /books/{id} — Negative and Robustness Scenarios

# Endpoint Information
- Method: PATCH
- Endpoint: /books/{id}
- Description: `books-controller` operation `partialUpdateBook`. The OpenAPI spec documents only a single
  response — `200 OK` returning a generic object. No error responses (e.g. `400`, `401`, `403`, `404`,
  `409`) are documented for this operation, and the request body itself is documented only as a generic
  `type: object, additionalProperties: { type: object }` map with no named properties or `required` array.
  This file therefore focuses on documented-absence gaps and API robustness for invalid path params,
  malformed/invalid request bodies, boundary violations (borrowed from the sibling `UpdateBookPayload`
  schema as a realistic baseline), and the undocumented author-referential-integrity behavior on the
  `authors` field — rather than asserting invented error codes.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint, so no unauthorized/forbidden test cases apply (see
  Notes).
- A seeded book with a known, valid `id` exists, to isolate "invalid input" failures from "resource
  doesn't exist" failures.
- At least one existing, valid author `id` (seeded via `POST /authors`) is available to build otherwise
  valid `authors` payloads for isolating individual negative constraints.
- An `id` value known NOT to correspond to any existing book is available (e.g. a very large integer
  unlikely to be assigned).
- An author `id` value known NOT to correspond to any existing author is available (e.g. a very large,
  unused integer), for the referential-integrity scenario.

# Test Data
- Valid payload (baseline for comparison): `{ "title": "ValidTitle" }`.
- Invalid payloads:
  - Wrong type: `{ "title": 12345 }` (number instead of string).
  - Wrong type: `{ "year": "not-a-year" }` (string instead of integer).
  - Wrong type: `{ "price": "19.99" }` (string instead of number).
  - Wrong type: `{ "available": "5" }` (string instead of integer).
  - Wrong type: `{ "authors": ["one"] }` (string items instead of `int64`).
  - Malformed JSON: `{ "title": "Broken" ` (missing closing brace / truncated body).
  - Non-object body: `[ "title", "PatchedTitle" ]` (array instead of object).
  - Non-object body: `"just a string"` (primitive instead of object).
  - `price` below realistic minimum (borrowed from `UpdateBookPayload.price`, `minimum: 1`):
    `{ "price": 0 }`.
  - `price` above realistic maximum (borrowed from `UpdateBookPayload.price`, `maximum: 10000`):
    `{ "price": 10000.01 }`.
  - `available` below realistic minimum (borrowed from `UpdateBookPayload.available`, `minimum: 1`):
    `{ "available": 0 }`.
  - `available` above realistic maximum (borrowed from `UpdateBookPayload.available`, `maximum: 10000`):
    `{ "available": 10001 }`.
  - Duplicate IDs in `authors` (borrowed `uniqueItems: true` assumption from `UpdateBookPayload.authors`):
    `{ "authors": [1, 1] }`.
  - Non-existent author ID in `authors`: `{ "authors": [999999999] }` (referential-integrity gap,
    undocumented — see Notes).
  - Server-managed / out-of-contract fields: `{ "id": 999, "coverId": 1 }` (client attempting to set
    server-generated/managed fields; `coverId` is documented as managed via a dedicated
    `PATCH /books/{id}/cover` endpoint, not this one).
- Invalid path params:
  - Non-numeric `id`: `abc`.
  - Decimal `id`: `1.5`.
  - Non-existent but validly-typed `id`: e.g. `999999999`.
- Auth variants: N/A — no auth documented; no negative auth cases apply.
- Reusable test values:
  - Known seeded book `id` (for isolating body-validation failures).
  - Known non-existent book `id` (for resource-not-found scenarios).
  - Known seeded author `id` (for isolating "invalid field" failures from "author doesn't exist"
    failures).
  - Known non-existent author `id` (for the referential-integrity scenario).

# Test Cases

## Test Case ID
NEG-BOOKS-PATCH-001

## Scenario
Send a request with a non-numeric `id` path parameter.

## Purpose
Confirm the API rejects a path parameter that violates the documented `integer, format: int64` type.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: `abc`

### Query Params
None.

### Request Body
`{ "title": "PatchedTitle" }`

## Expected Status Code
Not explicitly documented in the OpenAPI spec (only `200` is defined for this operation). A `400`-class
response is the realistic expectation for a type-mismatched path parameter at the framework level, but
this must be observed against the running API and not assumed as guaranteed — execute and record the
actual status code.

## Expected Response
A validation/framework-level error body, or an ungraceful failure to be flagged as a robustness defect.

## Assertions
- Status assertion: response status code is not `200` and not an unhandled `5xx` server crash.
- Schema assertion: if a JSON body is returned, it is well-formed.

---

## Test Case ID
NEG-BOOKS-PATCH-002

## Scenario
Send a request with an `id` path parameter using a decimal value.

## Purpose
Confirm the API rejects a path parameter that does not conform to the documented `integer` type when a
decimal is supplied instead.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: `1.5`

### Query Params
None.

### Request Body
`{ "title": "DecimalIdTitle" }`

## Expected Status Code
Not documented in the OpenAPI spec. A `400`-class response is the realistic expectation, but this must be
observed against the running API.

## Expected Response
A validation/framework-level error body, or an ungraceful failure to be flagged as a robustness defect.

## Assertions
- Status assertion: response status code is not `200` and not an unhandled `5xx` server crash.
- Schema assertion: if a JSON body is returned, it is well-formed.

---

## Test Case ID
NEG-BOOKS-PATCH-003

## Scenario
Send a request for a non-existent (but validly-typed) book `id`.

## Purpose
Confirm the API's behavior when attempting to partially update a resource that does not exist — no `404`
is documented for this operation, so this is a contract-gap check.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a large integer known not to correspond to any existing book (e.g. `999999999`).

### Query Params
None.

### Request Body
`{ "title": "GhostBook" }`

## Expected Status Code
Not documented in the OpenAPI spec (only `200` is declared). Execute and record the actual status code;
flag as a contract gap if the API silently returns `200` for a non-existent resource, or if it returns an
undocumented `404`.

## Expected Response
Actual behavior must be observed — either a `404`-style error (undocumented) or an unexpected `200`/other
response.

## Assertions
- Status assertion: response status code is captured and compared against the documented contract (which
  declares only `200`); any non-`200` result is a contract-gap finding, and any `200` result for a
  non-existent resource is a data-integrity concern to flag.
- Schema assertion: if a JSON body is returned, it is well-formed.

---

## Test Case ID
NEG-BOOKS-PATCH-004

## Scenario
Send a malformed (truncated/invalid) JSON request body.

## Purpose
Confirm the API rejects syntactically invalid JSON gracefully rather than with an unhandled server error.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "title": "Broken"` (truncated / invalid JSON syntax).

## Expected Status Code
Not explicitly documented in the OpenAPI spec. A `400`-class response is the realistic expectation for
malformed JSON at the framework/deserialization level, but this must be observed against the running API.

## Expected Response
A framework-level parse-error response, or an ungraceful failure to be flagged as a robustness defect.

## Assertions
- Status assertion: response status code is not `200` and not an unhandled `5xx` server crash.
- Schema assertion: no partial/corrupt update is applied (verify via follow-up `GET /books/{id}` that the
  resource is unchanged).

---

## Test Case ID
NEG-BOOKS-PATCH-005

## Scenario
Send a non-object (array) request body.

## Purpose
Confirm the API rejects a request body that does not conform to the documented `type: object` shape.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`[ "title", "PatchedTitle" ]`

## Expected Status Code
Not explicitly documented. A `400`-class rejection is the realistic expectation for a type mismatch
against `type: object`, but this must be observed against the running API.

## Expected Response
A validation error, or an ungraceful failure to be flagged as a robustness defect.

## Assertions
- Status assertion: response status code is not `200` and not an unhandled `5xx` server crash.
- Schema assertion: no update is applied (verify via follow-up `GET /books/{id}` that the resource is
  unchanged).

---

## Test Case ID
NEG-BOOKS-PATCH-006

## Scenario
Send a request body with an incorrect field type (`title` as a number instead of a string).

## Purpose
Confirm the API validates field types even though the request schema is generically documented
(`additionalProperties: { type: object }` does not itself forbid this, but the realistic underlying field
is `string` per the `Book`/`UpdateBookPayload` schemas — see Notes).

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "title": 12345 }`

## Expected Status Code
Not documented in the OpenAPI spec for this specific validation. Execute and record the actual status
code; a `400`-class rejection or a graceful coercion/ignore is acceptable, an unhandled `5xx` is not.

## Expected Response
Actual behavior must be observed — type coercion, rejection, or silent acceptance are all undocumented
possibilities.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: if accepted (`200`), a follow-up `GET /books/{id}` is used to confirm what value was
  actually persisted, flagging silent type coercion as a contract-gap finding.

---

## Test Case ID
NEG-BOOKS-PATCH-007

## Scenario
Send a request body with an incorrect field type (`year` as a non-numeric string).

## Purpose
Confirm the API validates the `year` field type against the realistic `integer(int32)` expectation
(per the sibling `Book`/`UpdateBookPayload` schemas).

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "year": "not-a-year" }`

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed — either a validation rejection or an unhandled error. No documented
error body exists.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: if accepted (`200`), a follow-up `GET /books/{id}` is used to confirm what value
  was actually persisted, flagging silent acceptance/coercion as a contract-gap finding.

---

## Test Case ID
NEG-BOOKS-PATCH-008

## Scenario
Send a request body with an incorrect field type (`price` as a string instead of a number).

## Purpose
Confirm the API validates the `price` field type against the realistic `number` expectation.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "price": "19.99" }`

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed — either a validation rejection or coercion. No documented error body
exists.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: if accepted, the stored/returned `price` value (via follow-up `GET /books/{id}`) is
  recorded as a contract-gap finding.

---

## Test Case ID
NEG-BOOKS-PATCH-009

## Scenario
Send a request body with an incorrect field type (`available` as a string instead of an integer).

## Purpose
Confirm the API validates the `available` field type against the realistic `integer` expectation.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "available": "5" }`

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed — either a validation rejection or coercion. No documented error body
exists.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: if accepted, the stored/returned `available` value (via follow-up `GET /books/{id}`)
  is recorded as a contract-gap finding.

---

## Test Case ID
NEG-BOOKS-PATCH-010

## Scenario
Send `authors` items as an incorrect JSON type (strings instead of integers).

## Purpose
Confirm the API validates the `authors` array item type against the realistic `integer(int64)`
expectation (per the sibling `UpdateBookPayload.authors`/`CreateBookPayload.authors` schemas).

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "authors": ["one"] }`

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed — either a validation rejection or coercion. No documented error body
exists.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: if the request is accepted (`200`), it is flagged as a contract-gap finding since the
  spec does not document type-mismatch handling for `authors` items on this operation, and a follow-up
  `GET /books/{id}` is used to confirm what, if anything, was persisted.

---

## Test Case ID
NEG-BOOKS-PATCH-011

## Scenario
Patch `price` below the realistic minimum boundary (`0`, violating `UpdateBookPayload`'s documented
`minimum: 1`, used here as a baseline since the PATCH schema itself declares no constraint).

## Purpose
Confirm the API enforces (or does not enforce) the same `price` lower bound on PATCH as is formally
documented for `PUT /books/{id}`.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "price": 0 }`

## Expected Status Code
Not documented for this operation (the `minimum: 1` constraint is only formally declared on
`UpdateBookPayload`, used by `PUT`). Execute and record the actual status code; if the API silently
accepts an out-of-bounds `price` via PATCH while rejecting it via PUT, this is a cross-endpoint
consistency contract-gap finding. A `5xx` response is a robustness defect regardless.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against for this operation.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: the actual persisted `price` (via follow-up `GET /books/{id}`) is recorded and
  compared against the `PUT /books/{id}` boundary-rejection behavior (see
  `books-id-put-negative.scenario.md`) as a cross-endpoint consistency finding.

---

## Test Case ID
NEG-BOOKS-PATCH-012

## Scenario
Patch `price` above the realistic maximum boundary (`10000.01`, violating `UpdateBookPayload`'s documented
`maximum: 10000`).

## Purpose
Confirm the API enforces (or does not enforce) the same `price` upper bound on PATCH as is formally
documented for `PUT /books/{id}`.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "price": 10000.01 }`

## Expected Status Code
Not documented for this operation. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed; no documented error body exists.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: the actual persisted `price` (via follow-up `GET /books/{id}`) is recorded and
  compared against the `PUT /books/{id}` boundary-rejection behavior as a cross-endpoint consistency
  finding.

---

## Test Case ID
NEG-BOOKS-PATCH-013

## Scenario
Patch `available` below the realistic minimum boundary (`0`, violating `UpdateBookPayload`'s documented
`minimum: 1`).

## Purpose
Confirm the API enforces (or does not enforce) the same `available` lower bound on PATCH as is formally
documented for `PUT /books/{id}`.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "available": 0 }`

## Expected Status Code
Not documented for this operation. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed; no documented error body exists.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: the actual persisted `available` (via follow-up `GET /books/{id}`) is recorded and
  compared against the `PUT /books/{id}` boundary-rejection behavior as a cross-endpoint consistency
  finding.

---

## Test Case ID
NEG-BOOKS-PATCH-014

## Scenario
Patch `available` above the realistic maximum boundary (`10001`, violating `UpdateBookPayload`'s
documented `maximum: 10000`).

## Purpose
Confirm the API enforces (or does not enforce) the same `available` upper bound on PATCH as is formally
documented for `PUT /books/{id}`.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "available": 10001 }`

## Expected Status Code
Not documented for this operation. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed; no documented error body exists.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: the actual persisted `available` (via follow-up `GET /books/{id}`) is recorded and
  compared against the `PUT /books/{id}` boundary-rejection behavior as a cross-endpoint consistency
  finding.

---

## Test Case ID
NEG-BOOKS-PATCH-015

## Scenario
Patch `authors` with an array containing duplicate author IDs.

## Purpose
Confirm the API enforces (or does not enforce) the same `uniqueItems: true` constraint on PATCH as is
formally documented on the sibling `UpdateBookPayload.authors`/`CreateBookPayload.authors` schemas.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "authors": [1, 1] }`

## Expected Status Code
Not documented for this operation. Execute and record the actual status code; if the API silently
de-duplicates and returns `200`, this is recorded as a contract-gap finding (deduplication behavior is not
documented either).

## Expected Response
Either a validation rejection, or a `200` with the array silently de-duplicated — actual behavior must be
observed since deduplication vs. rejection is not specified.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: if accepted (`200`), the persisted `authors` array (verified via
  `GET /books/{id}`) is checked for whether duplicates were silently removed or preserved — recorded as a
  contract-gap finding either way.

---

## Test Case ID
NEG-BOOKS-PATCH-016

## Scenario
Patch `authors` with an array containing an ID that does not correspond to any existing author.

## Purpose
Confirm the API's referential-integrity behavior when a book's `authors` association is patched to
reference a non-existent author, since no named schema (and therefore no existence validation) is
documented for the PATCH request body, and no `400`/`404`/`409` response is declared for this operation.
This mirrors the identical undocumented referential-integrity gap already recorded for `POST /books`
(`books-post-negative.scenario.md`, `NEG-BOOKS-POST-009`) and for `DELETE /authors/{id}`
(`authors-id-delete-negative.scenario.md`, `NEG-AUTHORS-DELETE-007`) — here exercised from the
partial-update side of the same relationship.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "authors": [999999999] }`

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; whether the API rejects the
update (e.g. `400`/`404`-class), silently applies the update with a dangling author reference, or drops
the invalid ID from `authors` is undocumented. A `5xx` response is flagged as a robustness defect.

## Expected Response
Actual behavior must be observed and recorded as a contract-gap/business-rule finding regardless of
outcome, since the spec does not define referential-integrity validation between the patched `authors`
field and existing `Author` records.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: if accepted (`200`), `GET /books/{id}` is called to record whether the book was
  updated with a dangling/non-existent author reference, with the invalid ID silently dropped, or the
  patch call actually had no effect despite the top-level status — documented as a high-value contract-gap
  finding for the API team to clarify, on parity with `NEG-BOOKS-POST-009` and
  `NEG-AUTHORS-DELETE-007`.

---

## Test Case ID
NEG-BOOKS-PATCH-017

## Scenario
Send undocumented/server-managed fields in the payload (`id`, `coverId`).

## Purpose
Confirm the API safely ignores or rejects fields that a client should not be able to set via this generic
PATCH body — specifically that a client cannot override the book's server-generated `id`, and that
`coverId` (documented as managed exclusively via `PATCH /books/{id}/cover`) is not silently mutated
through this endpoint.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "id": 999, "coverId": 1 }`

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed. The PATCH request schema does not set `additionalProperties: false`, so
extra/out-of-contract fields are not a documented hard violation.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: a follow-up `GET /books/{id}` confirms the book's `id` is unchanged (i.e. the client
  cannot override the server-generated identifier via this call) — flagged as a security/contract-gap
  finding if it does change.
- Business assertion: a follow-up `GET /books/{id}` confirms `coverId` is either unchanged or, if it did
  change, is flagged as a contract-gap finding since cover management is documented as a separate,
  dedicated `multipart/form-data` operation (`PATCH /books/{id}/cover`), not this generic PATCH.

---

## Test Case ID
NEG-BOOKS-PATCH-018

## Scenario
Send the request with a missing `Content-Type` header.

## Purpose
Confirm the API's behavior when the request body is sent without declaring `application/json` as the
content type (not explicitly documented as required, but realistically expected by the framework).

### Headers
No `Content-Type` header sent.

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "title": "NoContentTypeTitle" }` (sent as raw body without declaring JSON content type).

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code (commonly a
`415 Unsupported Media Type` or `400` would be expected from the framework, but this is not documented and
must not be asserted as guaranteed).

## Expected Response
Actual behavior must be observed; no specific documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not an unhandled `5xx` server crash.
- Schema assertion: if a JSON body is returned, it is well-formed.

# Notes
- The OpenAPI spec documents only the `200` response for `PATCH /books/{id}`. No `400`, `401`, `403`,
  `404`, `409`, or `500` responses are declared for this operation. Per the "never assume undocumented
  behavior" rule, none of the test cases in this file assert a specific documented error status code — they
  instead capture actual behavior and flag deviations (especially `5xx` server errors, silent data
  corruption, or unexpected `200` on invalid/non-existent input) as robustness/contract-gap findings for the
  API team.
- The request body schema (`type: object, additionalProperties: { type: object }`) does not itself forbid
  wrong-typed values or out-of-bounds values, since no named properties are declared. Type-validation
  (NEG-BOOKS-PATCH-006 through 010) and boundary-violation (NEG-BOOKS-PATCH-011 through 014) test cases are
  therefore robustness/consistency checks based on the realistic assumption that `title`/`year`/`price`/
  `available`/`authors` behave per the sibling `Book`/`UpdateBookPayload` schemas, not hard contract
  violations per the PATCH schema as literally written.
- **`price`/`available` boundary consistency (key finding, NEG-BOOKS-PATCH-011 through 014):** since
  `UpdateBookPayload` (used by `PUT /books/{id}`) formally documents `minimum`/`maximum` bounds for `price`
  and `available` but the PATCH request schema does not, these test cases specifically check whether PATCH
  enforces the same bounds as PUT. A discrepancy between the two operations (e.g. PUT rejecting an
  out-of-bounds value that PATCH silently accepts) is flagged as a cross-endpoint data-integrity/contract-gap
  finding, since both operations mutate the same underlying `Book` resource.
- **Author referential integrity (key finding, NEG-BOOKS-PATCH-016):** the realistic patchable `authors`
  field is only assumed to be typed as `array<integer(int64)>` (per the sibling `UpdateBookPayload`/
  `CreateBookPayload` schemas) — the PATCH operation's own generic schema does not document that these IDs
  must correspond to existing `Author` records, nor any `400`/`404` response for a non-existent author ID.
  This is the same class of undocumented referential-integrity gap already identified for `POST /books`
  (`books-post-negative.scenario.md`, `NEG-BOOKS-POST-009`) and `DELETE /authors/{id}`
  (`authors-id-delete-negative.scenario.md`, `NEG-AUTHORS-DELETE-007`). NEG-BOOKS-PATCH-016 exercises the
  same relationship from the partial-update angle and is flagged as a high-value, business-critical finding
  for the API team regardless of which outcome (reject, silently drop, or persist a dangling reference) is
  actually observed.
- The `uniqueItems: true` constraint assumption on `authors` (NEG-BOOKS-PATCH-015) has no documented
  rejection/acceptance behavior beyond being borrowed from the sibling `UpdateBookPayload`/
  `CreateBookPayload` schemas; actual API behavior must be recorded rather than assumed.
- No authentication or authorization is documented for this endpoint (no `security` requirement, no
  `securitySchemes` component in the spec). Standard "unauthorized access" / "forbidden access" negative
  cases from the template are therefore not applicable and have been omitted rather than invented.
- No conflict scenarios (`409`) or invalid state transitions apply — the `Book` resource has no documented
  state machine for this operation.
- No query parameters exist for this operation, so "invalid query params" and "invalid pagination/filters"
  cases from the template are not applicable and have been omitted.
- `coverId` handling via this generic PATCH (NEG-BOOKS-PATCH-017) is a deliberate robustness check, not an
  assumed hard rejection, since the spec documents a separate, dedicated `PATCH /books/{id}/cover`
  (`multipart/form-data`) operation for cover management and does not explicitly forbid `coverId` from
  appearing in this endpoint's generic body.
- If the API team documents error responses and/or a named request schema for this endpoint in the future
  (e.g. `400` for invalid body/boundary violations, `404` for a non-existent `id`, `404`/`409` for a
  non-existent referenced author), this file must be updated to assert those specific documented status
  codes and bodies instead of the current "capture and flag" approach.
