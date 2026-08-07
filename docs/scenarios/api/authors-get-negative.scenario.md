# Scenario Title
GET /authors — Negative and Robustness Scenarios

# Endpoint Information
- Method: GET
- Endpoint: /authors
- Description: `authors-controller` operation `getAll_1`. The OpenAPI spec documents only a single
  response — `200 OK` returning an array of `Author`. No error responses (e.g. `400`, `401`, `403`,
  `404`, `500`) are documented for this operation. This file therefore focuses on documented-absence
  gaps and API robustness for undocumented/malformed input, rather than asserting invented error codes.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint, so no unauthorized/forbidden test cases apply (see
  Notes).
- No path parameters exist for this operation, so no invalid-path-param scenarios apply.
- No request body exists for this operation (GET), so no malformed-body scenarios apply.

# Test Data
- Valid payload: N/A — GET request, no request body.
- Invalid payloads: N/A — no request body to malform.
- Auth variants: N/A — no auth documented; no negative auth cases apply.
- Boundary values: no `minLength`/`maxLength`/pattern documented on `firstName`/`lastName` query params,
  so boundary tests below are exploratory/robustness-focused rather than contract-documented failures.
- Reusable test values:
  - Excessively long string (e.g. several thousand characters) for `firstName`/`lastName`.
  - Special characters / injection-style payloads (e.g. `' OR '1'='1`, `<script>alert(1)</script>`) for
    `firstName`/`lastName`.
  - Duplicate query parameter (`firstName` supplied twice with different values).
  - Unknown/undocumented query parameter (e.g. `sortBy=firstName`).
  - Malformed URL-encoded query value (e.g. `%zz`).

# Test Cases

## Test Case ID
NEG-AUTHORS-GET-001

## Scenario
Send an excessively long value for `firstName`.

## Purpose
Confirm the API handles an unbounded-length filter value gracefully (no documented `maxLength` exists on
this field, so this is a robustness/contract-gap check, not a documented validation failure).

### Headers
None required.

### Path Params
None.

### Query Params
- `firstName`: a string far beyond typical name length (e.g. 5,000 characters).

### Request Body
None.

## Expected Status Code
Not documented in the OpenAPI spec (only `200` is defined for this operation). Execute and record the
actual status code; flag as a contract gap if it is not `200` with an empty/filtered array or if the
server errors ungracefully (e.g. `500`).

## Expected Response
Either a successful empty/filtered array, or a graceful validation error — actual behavior must be
observed against the running API since it is undocumented.

## Assertions
- Status assertion: response status code is captured and compared against the observed baseline; a `5xx`
  response is flagged as a robustness defect regardless of documentation gaps.
- Schema assertion: if status is `200`, response body is still a well-formed JSON array.

---

## Test Case ID
NEG-AUTHORS-GET-002

## Scenario
Send special/injection-style characters in `firstName` and `lastName`.

## Purpose
Confirm the filter parameters are safely handled and do not cause a server error or expose unfiltered/
unexpected data (basic input-handling robustness check for a query parameter used in filtering).

### Headers
None required.

### Path Params
None.

### Query Params
- `firstName`: `' OR '1'='1`
- `lastName`: `<script>alert(1)</script>`

### Request Body
None.

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
A well-formed JSON array (empty or filtered), with no server error and no evidence of unfiltered data
being returned.

## Assertions
- Status assertion: response status code is not `5xx`.
- Schema assertion: response body, if `200`, is a valid JSON array.
- Business assertion: response does not return the full unfiltered author collection (i.e. the special
  characters are treated as literal filter values, not bypassed).

---

## Test Case ID
NEG-AUTHORS-GET-003

## Scenario
Supply the same query parameter twice with conflicting values (`firstName=A&firstName=B`).

## Purpose
Confirm documented/undocumented behavior when a query parameter is duplicated — the spec does not define
this, so the goal is to capture actual behavior as a contract-gap finding.

### Headers
None required.

### Path Params
None.

### Query Params
- `firstName=Alice&firstName=Bob` (raw duplicate query string).

### Request Body
None.

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code and which value (if any)
is used for filtering.

## Expected Response
A well-formed JSON array; actual filtering behavior (first value used, last value used, both values
combined, or error) must be observed and documented.

## Assertions
- Status assertion: response status code is not `5xx`.
- Schema assertion: response body, if returned, is a valid JSON array.
- Business assertion: behavior is recorded for contract documentation — no specific outcome is asserted
  as "correct" since the spec does not define one.

---

## Test Case ID
NEG-AUTHORS-GET-004

## Scenario
Supply an unknown/undocumented query parameter (e.g. `sortBy=firstName`).

## Purpose
Confirm the API ignores undocumented query parameters gracefully rather than erroring, supporting forward
compatibility.

### Headers
None required.

### Path Params
None.

### Query Params
- `sortBy`: `firstName` (not documented on this operation).

### Request Body
None.

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code.

## Expected Response
Expected to behave the same as the unfiltered happy path (undocumented parameter ignored), but this must
be confirmed against the running API rather than assumed.

## Assertions
- Status assertion: response status code is not `5xx`.
- Schema assertion: response body, if `200`, is a valid JSON array matching the unfiltered collection
  shape.
- Business assertion: presence of the unknown parameter does not cause a server error.

---

## Test Case ID
NEG-AUTHORS-GET-005

## Scenario
Send a malformed URL-encoded value in a query parameter (e.g. `firstName=%zz`).

## Purpose
Confirm the API/HTTP layer handles malformed URL encoding without an ungraceful failure.

### Headers
None required.

### Path Params
None.

### Query Params
- `firstName`: `%zz` (invalid percent-encoding).

### Request Body
None.

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code (commonly a `400`-class
response would be expected from the HTTP layer, but this is not documented by the spec and must not be
asserted as guaranteed).

## Expected Response
Actual behavior must be observed; no specific documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not an unhandled `5xx` server crash.
- Schema assertion: if a JSON body is returned, it is well-formed.

# Notes
- The OpenAPI spec documents only the `200` response for `GET /authors`. No `400`, `401`, `403`, `404`,
  or `500` responses are declared for this operation. Per the "never assume undocumented behavior" rule,
  none of the test cases in this file assert a specific documented error status code — they instead
  capture actual behavior and flag deviations (especially `5xx` server errors) as robustness/contract-gap
  findings for the API team.
- No authentication or authorization is documented for this endpoint (no `security` requirement, no
  `securitySchemes` component in the spec). Standard "unauthorized access" / "forbidden access" negative
  cases from the template are therefore not applicable and have been omitted rather than invented.
- No path parameters exist for `GET /authors`, so "invalid path params" and "resource not found" cases
  from the template are not applicable and have been omitted.
- No request body exists for this GET operation, so "missing required fields", "invalid field types",
  "invalid enums", "invalid formats", and "malformed JSON body" cases from the template are not
  applicable and have been omitted.
- No conflict scenarios (409), invalid state transitions, or invalid business rules apply — this is a
  read-only list endpoint with no state-changing side effects.
- If the API team documents error responses for this endpoint in the future (e.g. `400` for malformed
  query input), this file must be updated to assert those specific documented status codes and bodies.
