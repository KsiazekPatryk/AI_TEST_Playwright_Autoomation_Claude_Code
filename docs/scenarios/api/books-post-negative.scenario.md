# Scenario Title
POST /books — Negative and Robustness Scenarios

# Endpoint Information
- Method: POST
- Endpoint: /books
- Description: `books-controller` operation `createBook`. The OpenAPI spec documents only a single
  response — `201 Created` returning a generic object. No error responses (e.g. `400`, `401`, `403`,
  `404`, `409`, `415`, `500`) are documented for this operation. Unlike `POST /authors`, `CreateBookPayload`
  *does* declare explicit, documented request-level constraints: `required: ["authors", "available",
  "price", "year"]`, `authors` as a `uniqueItems: true` array of `int64` author IDs, `price` bounded
  `0.01`–`1000` (inclusive), and `available` bounded `1`–`10000` (inclusive). This file prioritizes
  exercising those documented constraints, then covers general request robustness and the undocumented
  author-referential-integrity gap, rather than asserting invented error codes for anything not documented.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint, so no unauthorized/forbidden test cases apply (see
  Notes).
- No path parameters exist for this operation, so no invalid-path-param scenarios apply.
- The `requestBody` is declared `required: true` with a single supported media type,
  `application/json`.
- At least one existing, valid author `id` (seeded via `POST /authors`) is available to build otherwise
  valid payloads for isolating each individual negative constraint.
- An author `id` value known NOT to correspond to any existing author is available (e.g. a very large,
  unused integer), for the referential-integrity scenario.

# Test Data
- Valid payload (baseline for comparison): `{ "title": "Baseline Book", "authors": [<seeded author id>], "year": 2000, "price": 10.00, "available": 5 }`.
- Invalid payloads:
  - Missing body entirely: no JSON body sent at all (violates documented `required: true`).
  - Malformed JSON syntax: `{ "title": "X", "authors": [1], "year": 2000, "price": }` (trailing/invalid
    token).
  - Missing required `authors`: baseline payload with `authors` omitted.
  - Missing required `year`: baseline payload with `year` omitted.
  - Missing required `price`: baseline payload with `price` omitted.
  - Missing required `available`: baseline payload with `available` omitted.
  - Duplicate IDs in `authors`: `{ ..., "authors": [1, 1] }` (violates documented `uniqueItems: true`).
  - Empty `authors` array: `{ ..., "authors": [] }` (required field present but with no documented
    `minItems`, so a book with zero authors — a business/contract-gap edge case).
  - Non-existent author ID in `authors`: `{ ..., "authors": [999999999] }` (referential-integrity gap,
    undocumented — see Notes).
  - `price` below minimum: `{ ..., "price": 0 }` (violates documented `minimum: 0.01`).
  - `price` above maximum: `{ ..., "price": 1000.01 }` (violates documented `maximum: 1000`).
  - `available` below minimum: `{ ..., "available": 0 }` (violates documented `minimum: 1`).
  - `available` above maximum: `{ ..., "available": 10001 }` (violates documented `maximum: 10000`).
  - Wrong type for `authors` items: `{ ..., "authors": ["one"] }` (string instead of `int64`).
  - Wrong type for `price`: `{ ..., "price": "19.99" }` (string instead of `number`).
  - Wrong type for `available`: `{ ..., "available": "5" }` (string instead of `integer`).
  - Undocumented/extra fields: `{ ..., "id": 999, "coverId": 1 }` (client attempting to set
    server-generated fields).
- Reusable test values:
  - Non-`application/json` `Content-Type` header (e.g. `text/plain`).
  - Known seeded author `id` (for isolating "invalid field" failures from "author doesn't exist"
    failures).
  - Known non-existent author `id` (for the referential-integrity scenario).

# Test Cases

## Test Case ID
NEG-BOOKS-POST-001

## Scenario
Send the request with no request body at all.

## Purpose
Confirm the documented `requestBody.required: true` constraint is enforced when no body is sent.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
(none sent)

## Expected Status Code
Not explicitly documented, but `requestBody.required: true` implies a client-error response (commonly
`400`-class) is expected when no body is provided. Execute and record the actual status code; a `5xx`
response is flagged as a robustness defect regardless of the documentation gap on the exact code.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not `201`, and not `5xx`.
- Schema assertion: if a JSON error body is returned, it is well-formed.

---

## Test Case ID
NEG-BOOKS-POST-002

## Scenario
Send a request body with malformed JSON syntax.

## Purpose
Confirm the API rejects syntactically invalid JSON gracefully rather than erroring ungracefully.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```
{ "title": "X", "authors": [1], "year": 2000, "price": }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed; commonly a `400`-class parse error is expected from the framework, but
this is not documented by the spec and must not be asserted as guaranteed.

## Assertions
- Status assertion: response status code is captured and is not `201`, and not an unhandled `5xx` crash.
- Schema assertion: no book is created as a result of this call (verified via a follow-up `GET /books`
  lookup, if feasible).

---

## Test Case ID
NEG-BOOKS-POST-003

## Scenario
Send a payload missing the required `authors` field.

## Purpose
Confirm the API enforces the documented `required: ["authors", ...]` constraint on `CreateBookPayload`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Missing Authors", "year": 2000, "price": 10.00, "available": 5 }
```

## Expected Status Code
Not documented with a specific status code in the OpenAPI spec (no `400` response declared for
`createBook`), but `authors` being listed in `required` implies rejection is expected. Execute and record
the actual status code; a `201` (silently accepting a required-field violation) or a `5xx` are both flagged
as defects.

## Expected Response
A validation-style rejection is conventionally expected; exact body is undocumented.

## Assertions
- Status assertion: response status code is captured and is not `201` (a missing required field should not
  succeed as if a resource were created), and not `5xx`.
- Business assertion: no book is created as a side effect of the rejected request.

---

## Test Case ID
NEG-BOOKS-POST-004

## Scenario
Send a payload missing the required `year` field.

## Purpose
Confirm the API enforces the documented `required: [..., "year"]` constraint on `CreateBookPayload`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Missing Year", "authors": [1], "price": 10.00, "available": 5 }
```

## Expected Status Code
Not documented with a specific status code, but `year` being listed in `required` implies rejection is
expected. Execute and record the actual status code; a `201` or `5xx` is flagged as a defect.

## Expected Response
A validation-style rejection is conventionally expected; exact body is undocumented.

## Assertions
- Status assertion: response status code is captured and is not `201`, and not `5xx`.
- Business assertion: no book is created as a side effect of the rejected request.

---

## Test Case ID
NEG-BOOKS-POST-005

## Scenario
Send a payload missing the required `price` field.

## Purpose
Confirm the API enforces the documented `required: [..., "price"]` constraint on `CreateBookPayload`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Missing Price", "authors": [1], "year": 2000, "available": 5 }
```

## Expected Status Code
Not documented with a specific status code, but `price` being listed in `required` implies rejection is
expected. Execute and record the actual status code; a `201` or `5xx` is flagged as a defect.

## Expected Response
A validation-style rejection is conventionally expected; exact body is undocumented.

## Assertions
- Status assertion: response status code is captured and is not `201`, and not `5xx`.
- Business assertion: no book is created as a side effect of the rejected request.

---

## Test Case ID
NEG-BOOKS-POST-006

## Scenario
Send a payload missing the required `available` field.

## Purpose
Confirm the API enforces the documented `required: [..., "available"]` constraint on `CreateBookPayload`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Missing Available", "authors": [1], "year": 2000, "price": 10.00 }
```

## Expected Status Code
Not documented with a specific status code, but `available` being listed in `required` implies rejection
is expected. Execute and record the actual status code; a `201` or `5xx` is flagged as a defect.

## Expected Response
A validation-style rejection is conventionally expected; exact body is undocumented.

## Assertions
- Status assertion: response status code is captured and is not `201`, and not `5xx`.
- Business assertion: no book is created as a side effect of the rejected request.

---

## Test Case ID
NEG-BOOKS-POST-007

## Scenario
Send an `authors` array containing duplicate author IDs.

## Purpose
Confirm the API enforces the documented `uniqueItems: true` constraint on `CreateBookPayload.authors`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Duplicate Authors", "authors": [1, 1], "year": 2000, "price": 10.00, "available": 5 }
```

## Expected Status Code
Not documented with a specific status code, but `uniqueItems: true` implies rejection of a duplicate-ID
array is expected. Execute and record the actual status code; if the API silently de-duplicates and
returns `201`, this is recorded as a contract-gap finding (deduplication behavior is not documented
either).

## Expected Response
Either a validation rejection, or a `201` with the array silently de-duplicated — actual behavior must be
observed since deduplication vs. rejection is not specified.

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: if accepted (`201`), the persisted `authors` array (verified via `GET /books/{id}`)
  is checked for whether duplicates were silently removed or preserved — recorded as a contract-gap
  finding either way, since `uniqueItems: true` is violated by the input.

---

## Test Case ID
NEG-BOOKS-POST-008

## Scenario
Send an empty `authors` array (`[]`).

## Purpose
Confirm the API's behavior for a book with zero authors, since `authors` is required (the array itself
must be present) but no `minItems` is documented, leaving "can a book have no authors" as a business-rule
gap.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Authorless Book", "authors": [], "year": 2000, "price": 10.00, "available": 5 }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Either a successful creation of an authorless book, or a graceful validation rejection — actual behavior
must be observed and reported to the API team as a business-rule clarification request either way.

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: if created (`201`), `GET /books/{id}` confirms whether `authors` is persisted as an
  empty array — flagged as a business-rule/contract-gap finding for the API team to confirm intent.

---

## Test Case ID
NEG-BOOKS-POST-009

## Scenario
Send an `authors` array containing an ID that does not correspond to any existing author.

## Purpose
Confirm the API's referential-integrity behavior when a book is created referencing a non-existent author,
since `CreateBookPayload.authors` documents only `type: integer(int64)` per item with no documented
existence validation, and no `400`/`404`/`409` response is declared for this operation. This mirrors the
undocumented referential-integrity gap already recorded for `DELETE /authors/{id}` when an author is still
referenced by a book (`authors-id-delete-negative.scenario.md`, NEG-AUTHORS-DELETE-007) — here exercised
from the creation side of the same relationship.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Ghost Author Book", "authors": [999999999], "year": 2000, "price": 10.00, "available": 5 }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; whether the API rejects the
creation (e.g. `400`/`404`-class), silently creates the book with a dangling author reference, or drops the
invalid ID from `authors` is undocumented. A `5xx` response is flagged as a robustness defect.

## Expected Response
Actual behavior must be observed and recorded as a contract-gap/business-rule finding regardless of
outcome, since the spec does not define referential-integrity validation between `CreateBookPayload.authors`
and existing `Author` records.

## Assertions
- Status assertion: response status code is captured and is not an unhandled `5xx` crash.
- Business assertion: if created (`201`), `GET /books/{id}` is called to record whether the book was
  created with a dangling/non-existent author reference, with the invalid ID silently dropped, or the
  create call actually failed despite the top-level status — documented as a high-value contract-gap
  finding for the API team to clarify (rejection, on the parity of the `Author → Book` referential-integrity
  gap already found on the delete side).

---

## Test Case ID
NEG-BOOKS-POST-010

## Scenario
Send `price` below the documented minimum boundary (`0`, violating `minimum: 0.01`).

## Purpose
Confirm the API enforces the documented `minimum: 0.01` constraint on `CreateBookPayload.price`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Too Cheap", "authors": [1], "year": 2000, "price": 0, "available": 5 }
```

## Expected Status Code
Not documented with a specific status code, but the documented `minimum: 0.01` implies rejection is
expected. Execute and record the actual status code; a `201` or `5xx` is flagged as a defect.

## Expected Response
A validation-style rejection is conventionally expected; exact body is undocumented.

## Assertions
- Status assertion: response status code is captured and is not `201`, and not `5xx`.
- Business assertion: no book is created as a side effect of the rejected request.

---

## Test Case ID
NEG-BOOKS-POST-011

## Scenario
Send `price` above the documented maximum boundary (`1000.01`, violating `maximum: 1000`).

## Purpose
Confirm the API enforces the documented `maximum: 1000` constraint on `CreateBookPayload.price`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Too Expensive", "authors": [1], "year": 2000, "price": 1000.01, "available": 5 }
```

## Expected Status Code
Not documented with a specific status code, but the documented `maximum: 1000` implies rejection is
expected. Execute and record the actual status code; a `201` or `5xx` is flagged as a defect.

## Expected Response
A validation-style rejection is conventionally expected; exact body is undocumented.

## Assertions
- Status assertion: response status code is captured and is not `201`, and not `5xx`.
- Business assertion: no book is created as a side effect of the rejected request.

---

## Test Case ID
NEG-BOOKS-POST-012

## Scenario
Send `available` below the documented minimum boundary (`0`, violating `minimum: 1`).

## Purpose
Confirm the API enforces the documented `minimum: 1` constraint on `CreateBookPayload.available`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Zero Stock", "authors": [1], "year": 2000, "price": 10.00, "available": 0 }
```

## Expected Status Code
Not documented with a specific status code, but the documented `minimum: 1` implies rejection is expected.
Execute and record the actual status code; a `201` or `5xx` is flagged as a defect.

## Expected Response
A validation-style rejection is conventionally expected; exact body is undocumented.

## Assertions
- Status assertion: response status code is captured and is not `201`, and not `5xx`.
- Business assertion: no book is created as a side effect of the rejected request.

---

## Test Case ID
NEG-BOOKS-POST-013

## Scenario
Send `available` above the documented maximum boundary (`10001`, violating `maximum: 10000`).

## Purpose
Confirm the API enforces the documented `maximum: 10000` constraint on `CreateBookPayload.available`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Overstocked", "authors": [1], "year": 2000, "price": 10.00, "available": 10001 }
```

## Expected Status Code
Not documented with a specific status code, but the documented `maximum: 10000` implies rejection is
expected. Execute and record the actual status code; a `201` or `5xx` is flagged as a defect.

## Expected Response
A validation-style rejection is conventionally expected; exact body is undocumented.

## Assertions
- Status assertion: response status code is captured and is not `201`, and not `5xx`.
- Business assertion: no book is created as a side effect of the rejected request.

---

## Test Case ID
NEG-BOOKS-POST-014

## Scenario
Send `authors` items as an incorrect JSON type (strings instead of integers).

## Purpose
Confirm the API enforces the documented `type: integer(int64)` constraint on `authors` array items.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Wrong Author Type", "authors": ["one"], "year": 2000, "price": 10.00, "available": 5 }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed — either a validation rejection or coercion. No documented error body
exists.

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: if the request is accepted (`201`), it is flagged as a contract-gap finding since the
  spec does not document type-mismatch handling for `authors` items.

---

## Test Case ID
NEG-BOOKS-POST-015

## Scenario
Send `price` as an incorrect JSON type (string instead of number).

## Purpose
Confirm the API enforces the documented `type: number` constraint on `price`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Wrong Price Type", "authors": [1], "year": 2000, "price": "19.99", "available": 5 }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed — either a validation rejection or coercion. No documented error body
exists.

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: if accepted, the stored/returned `price` value is recorded as a contract-gap
  finding.

---

## Test Case ID
NEG-BOOKS-POST-016

## Scenario
Send `available` as an incorrect JSON type (string instead of integer).

## Purpose
Confirm the API enforces the documented `type: integer` constraint on `available`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Wrong Available Type", "authors": [1], "year": 2000, "price": 10.00, "available": "5" }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed — either a validation rejection or coercion. No documented error body
exists.

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: if accepted, the stored/returned `available` value is recorded as a contract-gap
  finding.

---

## Test Case ID
NEG-BOOKS-POST-017

## Scenario
Send undocumented/extra fields in the payload (e.g. client-supplied `id`, `coverId`).

## Purpose
Confirm the API safely ignores or rejects fields not declared on `CreateBookPayload`, and specifically
that a client cannot force-set server-generated fields (`id`, `coverId`) via the request body.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Spoofed Fields", "authors": [1], "year": 2000, "price": 10.00, "available": 5, "id": 999, "coverId": 1 }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed. `CreateBookPayload` does not set `additionalProperties: false`, so extra
fields are not a documented hard violation.

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: if the record is created, the server-assigned `id` does not equal the
  client-supplied `999` (i.e. the client cannot override server-generated identifiers) — flagged as a
  security/contract-gap finding if it does.
- Business assertion: the client-supplied `coverId` is not silently accepted as the book's cover reference
  without going through the documented `PATCH /books/{id}/cover` upload flow — flagged as a contract-gap
  finding either way.

---

## Test Case ID
NEG-BOOKS-POST-018

## Scenario
Send the request with an unsupported `Content-Type` header (e.g. `text/plain`).

## Purpose
Confirm the API enforces the single documented request media type, `application/json`, since no other
content type is declared in `requestBody.content` for this operation.

### Headers
`Content-Type: text/plain`.

### Path Params
None.

### Query Params
None.

### Request Body
```
{ "title": "Baseline Book", "authors": [1], "year": 2000, "price": 10.00, "available": 5 }
```
(sent as a raw string with a non-JSON content type)

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; commonly a `415
Unsupported Media Type` or `400` would be expected from the framework, but this is not documented and must
not be asserted as guaranteed. A `5xx` response is flagged as a robustness defect.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not `201`.
- Status assertion: response status code is not `5xx`.

# Notes
- The OpenAPI spec documents only the `201` response for `POST /books`. No `400`, `401`, `403`, `404`,
  `409`, `415`, or `500` responses are declared for this operation. Per the "never assume undocumented
  behavior" rule, test cases capture actual behavior and flag deviations (especially `5xx` server errors)
  as robustness/contract-gap findings, except where `CreateBookPayload` itself documents an explicit
  constraint (`required`, `uniqueItems`, `minimum`/`maximum`) — those are treated as higher-confidence
  expectations that a non-`201`/non-`5xx` rejection should occur (NEG-BOOKS-POST-003 through 007, 010–013).
- **Author referential integrity (key finding, NEG-BOOKS-POST-009):** `CreateBookPayload.authors` is typed
  only as `array<integer(int64)>` with `uniqueItems: true` — the spec does **not** document that these IDs
  must correspond to existing `Author` records, nor any `400`/`404` response for a non-existent author ID.
  This is the same class of undocumented referential-integrity gap already identified for
  `DELETE /authors/{id}` in `authors-id-delete-negative.scenario.md` (NEG-AUTHORS-DELETE-007), which
  covers deleting an author still referenced by a book. NEG-BOOKS-POST-009 covers the inverse direction —
  creating a book that references an author which was never created (or no longer exists) — and is flagged
  as a high-value, business-critical finding for the API team regardless of which outcome (reject, silently
  drop, or create a dangling reference) is actually observed.
- The `uniqueItems: true` constraint on `authors` (NEG-BOOKS-POST-007) and the empty-array case
  (NEG-BOOKS-POST-008) are both request-shape edge cases with no documented rejection/acceptance behavior
  beyond the bare `uniqueItems: true` flag itself; actual API behavior for both must be recorded rather
  than assumed.
- The one explicit request-level contract constraint beyond field-level rules is `requestBody.required:
  true`, exercised directly in NEG-BOOKS-POST-001 (no body sent at all).
- No authentication or authorization is documented for this endpoint (no `security` requirement, no
  `securitySchemes` component in the spec). Standard "unauthorized access" / "forbidden access" negative
  cases from the template are therefore not applicable and have been omitted rather than invented.
- No path parameters exist for `POST /books`, so "invalid path params" and "resource not found" cases from
  the template are not applicable and have been omitted.
- `CreateBookPayload` does not declare `additionalProperties: false`, so NEG-BOOKS-POST-017 treats
  extra/unknown fields as a contract-gap/robustness check rather than an asserted hard rejection.
- `year` has no documented `minimum`/`maximum`/format constraint on `CreateBookPayload`, so no dedicated
  boundary-violation case is defined for it here; this omission is deliberate (avoiding an invented
  constraint) rather than an oversight — if the API team documents a constraint on `year` in the future,
  this file must be updated.
- If the API team documents error responses for this endpoint in the future (e.g. `400` for invalid field
  types/missing required fields, `404`/`409` for a non-existent referenced author), this file must be
  updated to assert those specific documented status codes and bodies.
