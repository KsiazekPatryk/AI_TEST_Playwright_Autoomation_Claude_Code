# Scenario Title
PUT /authors/{id} — Negative and Robustness Scenarios

# Endpoint Information
- Method: PUT
- Endpoint: /authors/{id}
- Description: `authors-controller` operation `updateAuthor`. The OpenAPI spec documents only a single
  response — `200 OK` returning a generic object. No error responses (e.g. `400`, `401`, `403`, `404`,
  `415`, `500`) are documented for this operation, including no documented `404` for a non-existent
  `id`. This file therefore focuses on documented-absence gaps and API robustness for invalid path
  parameters and malformed/invalid request bodies, rather than asserting invented error codes, while still
  treating `requestBody.required: true` and the `id` path parameter's declared type as documented contract
  constraints.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint, so no unauthorized/forbidden test cases apply (see
  Notes).
- The `id` path parameter is declared `required: true` with `type: integer, format: int64` — this is the
  one explicit path-level constraint documented in the spec and is exercised in this file.
- The `requestBody` is declared `required: true` with a single supported media type,
  `application/json` — this is the one explicit request-level constraint documented in the spec and is
  exercised in this file.
- A known, existing author `id` (seeded via `POST /authors`) is available for negative test cases that
  need a syntactically valid but otherwise-irrelevant `id` (e.g. body-validation cases).

# Test Data
- Valid path param (baseline for comparison): `id` of a pre-existing, seeded author.
- Valid payload (baseline for comparison): `{ "firstName": "Charlotte", "lastName": "Bronte" }`.
- Invalid path params:
  - Non-existent `id`: a numeric `id` value guaranteed not to correspond to any existing author (e.g. a
    very large unused integer).
  - Non-numeric `id`: `"abc"` (violates documented `type: integer` on the path param).
  - Negative `id`: `-1` (numeric but semantically invalid; no documented `minimum` constraint, so this is
    a robustness check).
  - Zero `id`: `0` (no documented `minimum` constraint; robustness check).
  - Decimal `id`: `1.5` (violates documented `integer` type, which excludes fractional values).
- Invalid payloads:
  - Missing body entirely: no JSON body sent at all (violates documented `required: true`).
  - Malformed JSON syntax: `{ "firstName": "Jane", "lastName": }` (trailing/invalid token).
  - Wrong type for `firstName`: `{ "firstName": 12345, "lastName": "Austen" }`.
  - Wrong type for `lastName`: `{ "firstName": "Jane", "lastName": ["Austen"] }`.
  - Explicit `null` values: `{ "firstName": null, "lastName": null }`.
  - Undocumented/extra fields: `{ "firstName": "Jane", "lastName": "Austen", "id": 999, "createdAt":
    "2020-01-01" }`.
- Boundary values: no `minLength`/`maxLength`/pattern documented on `firstName`/`lastName`, so boundary
  tests below are exploratory/robustness-focused rather than contract-documented failures.
- Reusable test values:
  - Excessively long string (e.g. several thousand characters) for `firstName`/`lastName`.
  - Special characters / injection-style payloads (e.g. `' OR '1'='1`, `<script>alert(1)</script>`) for
    `firstName`/`lastName`.
  - Non-`application/json` `Content-Type` header (e.g. `text/plain`, `multipart/form-data`).

# Test Cases

## Test Case ID
NEG-AUTHORS-PUT-001

## Scenario
Attempt to update an author using a non-existent `id`.

## Purpose
Confirm the API's behavior when the target resource does not exist, since no `404` (or any error)
response is documented for `updateAuthor`.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a numeric value guaranteed not to correspond to any existing author.

### Query Params
None.

### Request Body
```json
{ "firstName": "Ghost", "lastName": "Writer" }
```

## Expected Status Code
Not documented in the OpenAPI spec (only `200` is defined for this operation, with no `404`). Execute and
record the actual status code; a resource-not-found scenario returning `200` (e.g. silently creating or
no-op'ing) or a `5xx` server error are both flagged as contract-gap/robustness findings.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against. A `404 Not Found`
would be the conventionally expected outcome but is not guaranteed by the spec.

## Assertions
- Status assertion: response status code is captured and is not an unhandled `5xx` crash.
- Business assertion: no unintended side effect occurs (e.g. a new author is not silently created with the
  supplied `id` unless that is explicitly the documented/observed behavior) — recorded as a contract-gap
  finding.

---

## Test Case ID
NEG-AUTHORS-PUT-002

## Scenario
Attempt to update an author using a non-numeric `id` (`"abc"`).

## Purpose
Confirm the API enforces the documented `type: integer, format: int64` constraint on the `id` path
parameter.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: `abc`

### Query Params
None.

### Request Body
```json
{ "firstName": "Charlotte", "lastName": "Bronte" }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; commonly a `400`-class
response would be expected from path-variable type conversion, but this is not documented and must not be
asserted as guaranteed. A `5xx` response is flagged as a robustness defect.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not `200`, and not an unhandled `5xx` crash.
- Schema assertion: if a JSON error body is returned, it is well-formed.

---

## Test Case ID
NEG-AUTHORS-PUT-003

## Scenario
Attempt to update an author using a negative `id` (`-1`).

## Purpose
Confirm the API handles a numerically valid but semantically implausible `id` gracefully (no documented
`minimum` constraint exists on this path parameter, so this is a robustness/contract-gap check).

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: `-1`

### Query Params
None.

### Request Body
```json
{ "firstName": "Charlotte", "lastName": "Bronte" }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed; a not-found-style response is conventionally expected but not
documented.

## Assertions
- Status assertion: response status code is captured and is not `200` (no author should be updated for a
  negative, non-existent `id`), and not an unhandled `5xx` crash.

---

## Test Case ID
NEG-AUTHORS-PUT-004

## Scenario
Attempt to update an author using a decimal `id` (`1.5`).

## Purpose
Confirm the API enforces the documented `integer` type (which excludes fractional values) on the `id`
path parameter.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: `1.5`

### Query Params
None.

### Request Body
```json
{ "firstName": "Charlotte", "lastName": "Bronte" }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not `200`, and not an unhandled `5xx` crash.

---

## Test Case ID
NEG-AUTHORS-PUT-005

## Scenario
Send the request with no request body at all.

## Purpose
Confirm the documented `requestBody.required: true` constraint is enforced when no body is sent (distinct
from sending an empty JSON object `{}`, which is a valid — and separately tested — instance of the
schema).

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

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
- Status assertion: response status code is captured and is not `200` (a missing required body should not
  succeed as if an update occurred) and not `5xx`.
- Business assertion: a subsequent `GET /authors/{id}` confirms the author's data was not modified as a
  result of this call.

---

## Test Case ID
NEG-AUTHORS-PUT-006

## Scenario
Send a request body with malformed JSON syntax.

## Purpose
Confirm the API rejects syntactically invalid JSON gracefully rather than erroring ungracefully.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```
{ "firstName": "Jane", "lastName": }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed; commonly a `400`-class parse error is expected from the framework, but
this is not documented by the spec and must not be asserted as guaranteed.

## Assertions
- Status assertion: response status code is captured and is not `200`, and not an unhandled `5xx` crash.
- Business assertion: the author's data is unchanged as a result of this call (verified via a follow-up
  `GET /authors/{id}`).

---

## Test Case ID
NEG-AUTHORS-PUT-007

## Scenario
Send `firstName` as an incorrect JSON type (integer instead of string).

## Purpose
Confirm the API enforces the documented `type: string` constraint on `firstName`.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```json
{ "firstName": 12345, "lastName": "Austen" }
```

## Expected Status Code
Not documented in the OpenAPI spec (no `400` response declared for `updateAuthor`). Execute and record
the actual status code; a `5xx` response is flagged as a robustness defect.

## Expected Response
Actual behavior must be observed — either a validation rejection or coercion. No documented error body
exists.

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: if the request is accepted (`200`), the persisted value for `firstName` is recorded
  (via `GET /authors/{id}`) to confirm whether the API coerces, rejects, or silently stores the value —
  flagged as a contract-gap finding since the spec does not document type-mismatch handling.

---

## Test Case ID
NEG-AUTHORS-PUT-008

## Scenario
Send `lastName` as an incorrect JSON type (array instead of string).

## Purpose
Confirm the API enforces the documented `type: string` constraint on `lastName`.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```json
{ "firstName": "Jane", "lastName": ["Austen"] }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed. No documented error body exists.

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: if accepted, the persisted/returned `lastName` value is recorded as a contract-gap
  finding.

---

## Test Case ID
NEG-AUTHORS-PUT-009

## Scenario
Send undocumented/extra fields in the payload (e.g. client-supplied `id`, unknown `createdAt`).

## Purpose
Confirm the API safely ignores or rejects fields not declared on `UpdateAuthorPayload`, and specifically
that a client cannot override the resource's `id` (from the path) via the request body.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```json
{ "firstName": "Jane", "lastName": "Austen", "id": 999, "createdAt": "2020-01-01" }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed. `UpdateAuthorPayload` does not set `additionalProperties: false`, so
extra fields are not a documented hard violation.

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: if the update succeeds, the updated author's `id` (verified via `GET
  /authors/{id}`) still equals the original path-param `id`, not the client-supplied body `id: 999` —
  flagged as a security/contract-gap finding if it does not.
- Business assertion: undocumented fields (e.g. `createdAt`) are not silently persisted and exposed
  without being part of the documented schema — recorded as a contract-gap finding either way.

---

## Test Case ID
NEG-AUTHORS-PUT-010

## Scenario
Send an excessively long value for `firstName`/`lastName`.

## Purpose
Confirm the API handles an unbounded-length input gracefully (no documented `maxLength` exists on either
field, so this is a robustness/contract-gap check, not a documented validation failure).

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```json
{ "firstName": "<5,000+ character string>", "lastName": "Bronte" }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response
(especially a database-level failure surfacing as an unhandled error) is flagged as a robustness defect.

## Expected Response
Either a successful update, or a graceful validation error — actual behavior must be observed against the
running API since it is undocumented.

## Assertions
- Status assertion: response status code is captured and is not an unhandled `5xx`.
- Business assertion: if accepted, no data truncation occurs silently without being documented.

---

## Test Case ID
NEG-AUTHORS-PUT-011

## Scenario
Send special/injection-style characters in `firstName` and `lastName`.

## Purpose
Confirm the fields are safely handled and do not cause a server error or unexpected data exposure (basic
input-handling robustness check).

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```json
{ "firstName": "' OR '1'='1", "lastName": "<script>alert(1)</script>" }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Either a successful update storing the literal string values, or a graceful validation rejection — no
server error and no evidence of injection/script execution.

## Assertions
- Status assertion: response status code is not `5xx`.
- Business assertion: if updated, the values are stored/returned as literal strings (not executed,
  interpreted, or used to alter query behavior) — verified via `GET /authors/{id}`.

---

## Test Case ID
NEG-AUTHORS-PUT-012

## Scenario
Send the request with an unsupported `Content-Type` header (e.g. `text/plain`).

## Purpose
Confirm the API enforces the single documented request media type, `application/json`, since no other
content type is declared in `requestBody.content` for this operation.

### Headers
`Content-Type: text/plain`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```
{ "firstName": "Jane", "lastName": "Austen" }
```
(sent as a raw string with a non-JSON content type)

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; commonly a `415
Unsupported Media Type` or `400` would be expected from the framework, but this is not documented and
must not be asserted as guaranteed. A `5xx` response is flagged as a robustness defect.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not `200`.
- Status assertion: response status code is not `5xx`.

# Notes
- The OpenAPI spec documents only the `200` response for `PUT /authors/{id}`. No `400`, `401`, `403`,
  `404`, `409`, `415`, or `500` responses are declared for this operation — notably including no `404` for
  a non-existent `id`, which is the most significant documented-absence gap for this endpoint. Per the
  "never assume undocumented behavior" rule, none of the test cases in this file assert a specific
  documented error status code — they instead capture actual behavior and flag deviations (especially
  `5xx` server errors and silent unintended side effects) as robustness/contract-gap findings for the API
  team.
- The two explicit contract constraints documented are the `id` path parameter's `type: integer, format:
  int64` and `requestBody.required: true`. These are exercised directly in NEG-AUTHORS-PUT-002/003/004
  (path param type) and NEG-AUTHORS-PUT-005 (missing body, as distinct from a valid empty `{}` body
  covered in the positive file).
- No authentication or authorization is documented for this endpoint (no `security` requirement, no
  `securitySchemes` component in the spec). Standard "unauthorized access" / "forbidden access" negative
  cases from the template are therefore not applicable and have been omitted rather than invented.
- No conflict scenarios (`409`) or invalid state-transition cases apply — the `Author` resource has no
  documented state machine or uniqueness constraint.
- `UpdateAuthorPayload` does not declare `additionalProperties: false`, so NEG-AUTHORS-PUT-009 treats
  extra/unknown fields as a contract-gap/robustness check rather than an asserted hard rejection.
- If the API team documents error responses for this endpoint in the future (e.g. `404` for a non-existent
  `id`, `400` for invalid field types or malformed path params, `415` for unsupported content type), this
  file must be updated to assert those specific documented status codes and bodies.
