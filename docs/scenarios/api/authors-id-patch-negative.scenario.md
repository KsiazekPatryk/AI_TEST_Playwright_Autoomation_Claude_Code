# Scenario Title
PATCH /authors/{id} — Negative and Robustness Scenarios

# Endpoint Information
- Method: PATCH
- Endpoint: /authors/{id}
- Description: `authors-controller` operation `partialUpdateAuthor`. The OpenAPI spec documents only a
  single response — `200 OK` returning a generic object. No error responses (e.g. `400`, `401`, `403`,
  `404`, `409`) are documented for this operation. This file therefore focuses on documented-absence gaps
  and API robustness for invalid path params, malformed/invalid request bodies, and non-existent
  resources, rather than asserting invented error codes.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint, so no unauthorized/forbidden test cases apply (see
  Notes).
- A seeded author with a known, valid `id` exists, to isolate "invalid input" failures from "resource
  doesn't exist" failures.
- An `id` value known NOT to correspond to any existing author is available (e.g. a very large integer
  unlikely to be assigned).

# Test Data
- Valid payload (baseline for comparison): `{ "firstName": "ValidFirst" }`.
- Invalid payloads:
  - Wrong type: `{ "firstName": 12345 }` (number instead of string).
  - Wrong type: `{ "lastName": true }` (boolean instead of string).
  - Malformed JSON: `{ "firstName": "Broken" ` (missing closing brace / truncated body).
  - Non-object body: `[ "firstName", "PatchedFirst" ]` (array instead of object).
  - Non-object body: `"just a string"` (primitive instead of object).
- Invalid path params:
  - Non-numeric `id`: `abc`.
  - Negative `id`: `-1`.
  - Zero `id`: `0`.
  - Decimal `id`: `1.5`.
  - Non-existent but validly-typed `id`: e.g. `999999999`.
- Auth variants: N/A — no auth documented; no negative auth cases apply.
- Reusable test values:
  - Known seeded author `id` (for isolating body-validation failures).
  - Known non-existent `id` (for resource-not-found scenarios).

# Test Cases

## Test Case ID
NEG-AUTHORS-PATCH-001

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
`{ "firstName": "PatchedFirst" }`

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
NEG-AUTHORS-PATCH-002

## Scenario
Send a request for a non-existent (but validly-typed) author `id`.

## Purpose
Confirm the API's behavior when attempting to partially update a resource that does not exist — no `404`
is documented for this operation, so this is a contract-gap check.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a large integer known not to correspond to any existing author (e.g. `999999999`).

### Query Params
None.

### Request Body
`{ "firstName": "GhostAuthor" }`

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
NEG-AUTHORS-PATCH-003

## Scenario
Send a malformed (truncated/invalid) JSON request body.

## Purpose
Confirm the API rejects syntactically invalid JSON gracefully rather than with an unhandled server error.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing author `id`.

### Query Params
None.

### Request Body
`{ "firstName": "Broken"` (truncated / invalid JSON syntax).

## Expected Status Code
Not explicitly documented in the OpenAPI spec. A `400`-class response is the realistic expectation for
malformed JSON at the framework/deserialization level, but this must be observed against the running API.

## Expected Response
A framework-level parse-error response, or an ungraceful failure to be flagged as a robustness defect.

## Assertions
- Status assertion: response status code is not `200` and not an unhandled `5xx` server crash.
- Schema assertion: no partial/corrupt update is applied (verify via follow-up `GET /authors/{id}` that
  the resource is unchanged).

---

## Test Case ID
NEG-AUTHORS-PATCH-004

## Scenario
Send a request body with an incorrect field type (`firstName` as a number instead of a string).

## Purpose
Confirm the API validates field types even though the request schema is generically documented
(`additionalProperties: { type: object }` does not itself forbid this, but the realistic underlying field
is `string` per the `Author`/`UpdateAuthorPayload` schemas — see Notes).

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing author `id`.

### Query Params
None.

### Request Body
`{ "firstName": 12345 }`

## Expected Status Code
Not documented in the OpenAPI spec for this specific validation. Execute and record the actual status
code; a `400`-class rejection or a graceful coercion/ignore is acceptable, an unhandled `5xx` is not.

## Expected Response
Actual behavior must be observed — type coercion, rejection, or silent acceptance are all undocumented
possibilities.

## Assertions
- Status assertion: response status code is not an unhandled `5xx` server crash.
- Business assertion: if accepted (`200`), a follow-up `GET /authors/{id}` is used to confirm what value
  was actually persisted, flagging silent type coercion as a contract-gap finding.

---

## Test Case ID
NEG-AUTHORS-PATCH-005

## Scenario
Send a non-object (array) request body.

## Purpose
Confirm the API rejects a request body that does not conform to the documented `type: object` shape.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing author `id`.

### Query Params
None.

### Request Body
`[ "firstName", "PatchedFirst" ]`

## Expected Status Code
Not explicitly documented. A `400`-class rejection is the realistic expectation for a type mismatch
against `type: object`, but this must be observed against the running API.

## Expected Response
A validation error, or an ungraceful failure to be flagged as a robustness defect.

## Assertions
- Status assertion: response status code is not `200` and not an unhandled `5xx` server crash.
- Schema assertion: no update is applied (verify via follow-up `GET /authors/{id}` that the resource is
  unchanged).

---

## Test Case ID
NEG-AUTHORS-PATCH-006

## Scenario
Send the request with a missing `Content-Type` header.

## Purpose
Confirm the API's behavior when the request body is sent without declaring `application/json` as the
content type (not explicitly documented as required, but realistically expected by the framework).

### Headers
No `Content-Type` header sent.

### Path Params
- `id`: a valid, existing author `id`.

### Query Params
None.

### Request Body
`{ "firstName": "NoContentTypeFirst" }` (sent as raw body without declaring JSON content type).

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code (commonly a
`415 Unsupported Media Type` or `400` would be expected from the framework, but this is not documented and
must not be asserted as guaranteed).

## Expected Response
Actual behavior must be observed; no specific documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not an unhandled `5xx` server crash.
- Schema assertion: if a JSON body is returned, it is well-formed.

---

## Test Case ID
NEG-AUTHORS-PATCH-007

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
`{ "firstName": "DecimalIdFirst" }`

## Expected Status Code
Not documented in the OpenAPI spec. A `400`-class response is the realistic expectation, but this must be
observed against the running API.

## Expected Response
A validation/framework-level error body, or an ungraceful failure to be flagged as a robustness defect.

## Assertions
- Status assertion: response status code is not `200` and not an unhandled `5xx` server crash.
- Schema assertion: if a JSON body is returned, it is well-formed.

# Notes
- The OpenAPI spec documents only the `200` response for `PATCH /authors/{id}`. No `400`, `401`, `403`,
  `404`, `409`, or `500` responses are declared for this operation. Per the "never assume undocumented
  behavior" rule, none of the test cases in this file assert a specific documented error status code —
  they instead capture actual behavior and flag deviations (especially `5xx` server errors, silent data
  corruption, or unexpected `200` on invalid/non-existent input) as robustness/contract-gap findings for
  the API team.
- The request body schema (`type: object, additionalProperties: { type: object }`) does not itself forbid
  wrong-typed values for `firstName`/`lastName`, since no named properties are declared. Type-validation
  test cases (NEG-AUTHORS-PATCH-004) are therefore robustness checks based on the realistic assumption that
  `firstName`/`lastName` are `string` fields (per the sibling `Author`/`UpdateAuthorPayload` schemas), not
  hard contract violations per the PATCH schema as literally written.
- No authentication or authorization is documented for this endpoint (no `security` requirement, no
  `securitySchemes` component in the spec). Standard "unauthorized access" / "forbidden access" negative
  cases from the template are therefore not applicable and have been omitted rather than invented.
- No conflict scenarios (`409`) or invalid state transitions apply — the `Author` resource has no
  documented state machine, uniqueness constraint, or dependent-resource conflict behavior for this
  operation.
- No query parameters exist for this operation, so "invalid query params" and "invalid pagination/filters"
  cases from the template are not applicable and have been omitted.
- If the API team documents error responses for this endpoint in the future (e.g. `400` for invalid body,
  `404` for a non-existent `id`), this file must be updated to assert those specific documented status
  codes and bodies instead of the current "capture and flag" approach.
- NEG-AUTHORS-PATCH-008 (added during implementation) covers authentication robustness: the spec declares no
  `securitySchemes` and no `security` requirement, so a syntactically valid but unparseable bearer token
  must either be ignored (`200`) or rejected cleanly (`401`). The live API instead returns
  `500 {"message":"Invalid token"}` for `PATCH /authors/{id}`, the same defect already recorded for
  `GET /authors` in NEG-AUTHORS-GET-006. The test is marked `test.fail()` so the defect stays visible in
  reports and the test turns red the moment the API is fixed.
