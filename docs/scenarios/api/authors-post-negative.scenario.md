# Scenario Title
POST /authors — Negative and Robustness Scenarios

# Endpoint Information
- Method: POST
- Endpoint: /authors
- Description: `authors-controller` operation `createAuthor`. The OpenAPI spec documents only a single
  response — `201 Created` returning a generic object. No error responses (e.g. `400`, `401`, `403`,
  `415`, `500`) are documented for this operation. This file therefore focuses on documented-absence gaps
  and API robustness for malformed/invalid input, rather than asserting invented error codes, while still
  treating `requestBody.required: true` as a documented contract constraint.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint, so no unauthorized/forbidden test cases apply (see
  Notes).
- No path parameters exist for this operation, so no invalid-path-param scenarios apply.
- The `requestBody` is declared `required: true` with a single supported media type,
  `application/json` — this is the one explicit request-level constraint documented in the spec and is
  exercised in this file.

# Test Data
- Valid payload (baseline for comparison): `{ "firstName": "Jane", "lastName": "Austen" }`.
- Invalid payloads:
  - Missing body entirely: no JSON body sent at all (violates documented `required: true`).
  - Malformed JSON syntax: `{ "firstName": "Jane", "lastName": }` (trailing/invalid token).
  - Wrong type for `firstName`: `{ "firstName": 12345, "lastName": "Austen" }`.
  - Wrong type for `lastName`: `{ "firstName": "Jane", "lastName": ["Austen"] }`.
  - Explicit `null` values: `{ "firstName": null, "lastName": null }`.
  - Undocumented/extra fields: `{ "firstName": "Jane", "lastName": "Austen", "id": 999, "middleName": "X" }`.
- Boundary values: no `minLength`/`maxLength`/pattern documented on `firstName`/`lastName`, so boundary
  tests below are exploratory/robustness-focused rather than contract-documented failures.
- Reusable test values:
  - Excessively long string (e.g. several thousand characters) for `firstName`/`lastName`.
  - Special characters / injection-style payloads (e.g. `' OR '1'='1`, `<script>alert(1)</script>`) for
    `firstName`/`lastName`.
  - Non-`application/json` `Content-Type` header (e.g. `text/plain`, `multipart/form-data`).

# Test Cases

## Test Case ID
NEG-AUTHORS-POST-001

## Scenario
Send the request with no request body at all.

## Purpose
Confirm the documented `requestBody.required: true` constraint is enforced when no body is sent (distinct
from sending an empty JSON object `{}`, which is a valid — and separately tested — instance of the
schema).

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
- Status assertion: response status code is captured and is not `201` (a missing required body should not
  succeed as if a resource were created) and not `5xx`.
- Schema assertion: if a JSON error body is returned, it is well-formed.

---

## Test Case ID
NEG-AUTHORS-POST-002

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
{ "firstName": "Jane", "lastName": }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed; commonly a `400`-class parse error is expected from the framework, but
this is not documented by the spec and must not be asserted as guaranteed.

## Assertions
- Status assertion: response status code is captured and is not `201`, and not an unhandled `5xx` crash.
- Schema assertion: no author is created as a result of this call (verified via a follow-up `GET
  /authors` count/lookup, if feasible).

---

## Test Case ID
NEG-AUTHORS-POST-003

## Scenario
Send `firstName` as an incorrect JSON type (integer instead of string).

## Purpose
Confirm the API enforces the documented `type: string` constraint on `firstName`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "firstName": 12345, "lastName": "Austen" }
```

## Expected Status Code
Not documented in the OpenAPI spec (no `400` response declared for `createAuthor`). Execute and record
the actual status code; a `5xx` response is flagged as a robustness defect.

## Expected Response
Actual behavior must be observed — either a validation rejection or coercion. No documented error body
exists.

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: if the request is accepted (`201`), the response/persisted value for `firstName` is
  recorded to confirm whether the API coerces, rejects, or silently stores the value — flagged as a
  contract-gap finding since the spec does not document type-mismatch handling.

---

## Test Case ID
NEG-AUTHORS-POST-004

## Scenario
Send `lastName` as an incorrect JSON type (array instead of string).

## Purpose
Confirm the API enforces the documented `type: string` constraint on `lastName`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

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
- Business assertion: if accepted, the stored/returned `lastName` value is recorded as a contract-gap
  finding.

---

## Test Case ID
NEG-AUTHORS-POST-005

## Scenario
Send explicit `null` values for both `firstName` and `lastName`.

## Purpose
Confirm documented/undocumented behavior when optional fields are explicitly nulled rather than omitted
(the spec does not declare `nullable` on either property).

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "firstName": null, "lastName": null }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed and compared against the omitted-fields case (`POS-AUTHORS-POST-004`) to
determine whether `null` is treated equivalently to "absent".

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: behavior is recorded for contract documentation (accepted-as-null vs. rejected) — no
  specific outcome is asserted as "correct" since the spec does not define `nullable` for these fields.

---

## Test Case ID
NEG-AUTHORS-POST-006

## Scenario
Send undocumented/extra fields in the payload (e.g. client-supplied `id`, unknown `middleName`).

## Purpose
Confirm the API safely ignores or rejects fields not declared on `CreateAuthorPayload`, and specifically
that a client cannot force-set the server-generated `id` via the request body.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "firstName": "Jane", "lastName": "Austen", "id": 999, "middleName": "X" }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed. `CreateAuthorPayload` does not set `additionalProperties: false`, so
extra fields are not a documented hard violation.

## Assertions
- Status assertion: response status code is captured and is not `5xx`.
- Business assertion: if the record is created, the server-assigned `id` does not equal the
  client-supplied `999` (i.e. the client cannot override server-generated identifiers) — flagged as a
  security/contract-gap finding if it does.
- Business assertion: undocumented fields (e.g. `middleName`) are not silently persisted and exposed
  without being part of the documented schema — recorded as a contract-gap finding either way.

---

## Test Case ID
NEG-AUTHORS-POST-007

## Scenario
Send an excessively long value for `firstName`/`lastName`.

## Purpose
Confirm the API handles an unbounded-length input gracefully (no documented `maxLength` exists on either
field, so this is a robustness/contract-gap check, not a documented validation failure).

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "firstName": "<5,000+ character string>", "lastName": "Austen" }
```

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response
(especially a database-level failure surfacing as an unhandled error) is flagged as a robustness defect.

## Expected Response
Either a successful creation, or a graceful validation error — actual behavior must be observed against
the running API since it is undocumented.

## Assertions
- Status assertion: response status code is captured and is not an unhandled `5xx`.
- Business assertion: if accepted, no data truncation occurs silently without being documented.

---

## Test Case ID
NEG-AUTHORS-POST-008

## Scenario
Send special/injection-style characters in `firstName` and `lastName`.

## Purpose
Confirm the fields are safely handled and do not cause a server error or unexpected data exposure (basic
input-handling robustness check).

### Headers
`Content-Type: application/json`.

### Path Params
None.

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
Either a successful creation storing the literal string values, or a graceful validation rejection — no
server error and no evidence of injection/script execution.

## Assertions
- Status assertion: response status code is not `5xx`.
- Business assertion: if created, the values are stored/returned as literal strings (not executed,
  interpreted, or used to alter query behavior).

---

## Test Case ID
NEG-AUTHORS-POST-009

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
- Status assertion: response status code is captured and is not `201`.
- Status assertion: response status code is not `5xx`.

# Notes
- The OpenAPI spec documents only the `201` response for `POST /authors`. No `400`, `401`, `403`, `404`,
  `409`, `415`, or `500` responses are declared for this operation. Per the "never assume undocumented
  behavior" rule, none of the test cases in this file assert a specific documented error status code —
  they instead capture actual behavior and flag deviations (especially `5xx` server errors) as
  robustness/contract-gap findings for the API team.
- The one explicit request-level contract constraint documented is `requestBody.required: true`, which is
  exercised directly in NEG-AUTHORS-POST-001 (no body sent at all, as distinct from a valid empty `{}`
  body covered in the positive file).
- No authentication or authorization is documented for this endpoint (no `security` requirement, no
  `securitySchemes` component in the spec). Standard "unauthorized access" / "forbidden access" negative
  cases from the template are therefore not applicable and have been omitted rather than invented.
- No path parameters exist for `POST /authors`, so "invalid path params" and "resource not found" cases
  from the template are not applicable and have been omitted.
- No conflict scenarios (`409`) or invalid state transitions apply — this is a stateless creation
  endpoint with no documented uniqueness constraint or state machine.
- `CreateAuthorPayload` does not declare `additionalProperties: false`, so NEG-AUTHORS-POST-006 treats
  extra/unknown fields as a contract-gap/robustness check rather than an asserted hard rejection.
- If the API team documents error responses for this endpoint in the future (e.g. `400` for invalid field
  types, `415` for unsupported content type), this file must be updated to assert those specific
  documented status codes and bodies.
- NEG-AUTHORS-POST-010 (added during implementation) covers authentication robustness: the spec declares no
  `securitySchemes` and no `security` requirement, so a syntactically valid but unparseable bearer token
  must either be ignored (`201`) or rejected cleanly (`401`). The live API instead returns
  `500 {"message":"Invalid token"}` for `POST /authors`, the same defect already recorded for
  `GET /authors` in NEG-AUTHORS-GET-006. The test is marked `test.fail()` so the defect stays visible in
  reports and the test turns red the moment the API is fixed.
