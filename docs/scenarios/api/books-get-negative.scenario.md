# Scenario Title
GET /books — Negative and Robustness Scenarios

# Endpoint Information
- Method: GET
- Endpoint: /books
- Description: `books-controller` operation `getAll`. The OpenAPI spec documents only a single response —
  `200 OK` returning an array of `RestBook`. No error responses (e.g. `400`, `401`, `403`, `404`, `500`)
  are documented for this operation. This file therefore focuses on documented-absence gaps, the
  `RestBook`/`RestAuthor` id-omission finding's business implications, and API robustness for
  undocumented/malformed input, rather than asserting invented error codes.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint, so no unauthorized/forbidden test cases apply (see
  Notes).
- No path parameters exist for this operation, so no invalid-path-param scenarios apply.
- No request body exists for this operation (GET), so no malformed-body scenarios apply.
- At least one seeded author `id` is known, for the "filter by author id" business-validation case.

# Test Data
- Valid payload: N/A — GET request, no request body.
- Invalid payloads: N/A — no request body to malform.
- Auth variants: N/A — no auth documented; no negative auth cases apply beyond the malformed-credential
  robustness check below.
- Boundary values: no `minLength`/`maxLength`/pattern documented on `title`/`author` query params, so
  boundary tests below are exploratory/robustness-focused rather than contract-documented failures.
- Reusable test values:
  - Excessively long string (e.g. several thousand characters) for `title`/`author`.
  - Special characters / injection-style payloads (e.g. `' OR '1'='1`, `<script>alert(1)</script>`) for
    `title`/`author`.
  - Duplicate query parameter (`title` supplied twice with different values).
  - Unknown/undocumented query parameter (e.g. `sortBy=price`, `page=0`).
  - Malformed URL-encoded query value (e.g. `%zz`).
  - A known seeded author's numeric `id` (e.g. `1`), used as the `author` query value to probe whether the
    filter accepts IDs.

# Test Cases

## Test Case ID
NEG-BOOKS-GET-001

## Scenario
Send an excessively long value for `title`.

## Purpose
Confirm the API handles an unbounded-length filter value gracefully (no documented `maxLength` exists on
this field, so this is a robustness/contract-gap check, not a documented validation failure).

### Headers
None required.

### Path Params
None.

### Query Params
- `title`: a string far beyond typical title length (e.g. 5,000 characters).

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
NEG-BOOKS-GET-002

## Scenario
Send special/injection-style characters in `title` and `author`.

## Purpose
Confirm the filter parameters are safely handled and do not cause a server error or expose unfiltered/
unexpected data (basic input-handling robustness check for query parameters used in filtering).

### Headers
None required.

### Path Params
None.

### Query Params
- `title`: `' OR '1'='1`
- `author`: `<script>alert(1)</script>`

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
- Business assertion: response does not return the full unfiltered book collection (i.e. the special
  characters are treated as literal filter values, not bypassed).

---

## Test Case ID
NEG-BOOKS-GET-003

## Scenario
Supply the same query parameter twice with conflicting values (`title=A&title=B`).

## Purpose
Confirm documented/undocumented behavior when a query parameter is duplicated — the spec does not define
this, so the goal is to capture actual behavior as a contract-gap finding.

### Headers
None required.

### Path Params
None.

### Query Params
- `title=Clean&title=Refactoring` (raw duplicate query string).

### Request Body
None.

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code and which value (if any) is
used for filtering.

## Expected Response
A well-formed JSON array; actual filtering behavior (first value used, last value used, both values
combined, or error) must be observed and documented.

## Assertions
- Status assertion: response status code is not `5xx`.
- Schema assertion: response body, if returned, is a valid JSON array.
- Business assertion: behavior is recorded for contract documentation — no specific outcome is asserted as
  "correct" since the spec does not define one.

---

## Test Case ID
NEG-BOOKS-GET-004

## Scenario
Supply an unknown/undocumented query parameter (e.g. `sortBy=price` or `page=0`).

## Purpose
Confirm the API ignores undocumented query parameters gracefully rather than erroring, supporting forward
compatibility, and confirm (per the schema Notes) that no pagination parameters are actually implemented
despite their absence from the spec being ambiguous rather than a guarantee.

### Headers
None required.

### Path Params
None.

### Query Params
- `sortBy`: `price` (not documented on this operation).
- `page`: `0` (not documented on this operation).

### Request Body
None.

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code.

## Expected Response
Expected to behave the same as the unfiltered happy path (undocumented parameters ignored, full collection
returned unsorted/unpaginated), but this must be confirmed against the running API rather than assumed.

## Assertions
- Status assertion: response status code is not `5xx`.
- Schema assertion: response body, if `200`, is a valid JSON array matching the unfiltered collection
  shape.
- Business assertion: presence of the unknown parameters does not cause a server error.
- Business assertion (contract-gap record): if the response array length/order differs from the unfiltered
  baseline, this indicates undocumented sorting/pagination support and must be reported to the API team.

---

## Test Case ID
NEG-BOOKS-GET-005

## Scenario
Send a malformed URL-encoded value in a query parameter (e.g. `title=%zz`).

## Purpose
Confirm the API/HTTP layer handles malformed URL encoding without an ungraceful failure.

### Headers
None required.

### Path Params
None.

### Query Params
- `title`: `%zz` (invalid percent-encoding).

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

---

## Test Case ID
NEG-BOOKS-GET-006

## Scenario
Send an invalid/unparseable bearer token in the `Authorization` header.

## Purpose
Confirm whether the malformed-credential defect already confirmed on `GET /authors`
(`authors-get-negative.scenario.md`, NEG-AUTHORS-GET-006 — a `500 Internal Server Error` with
`{"error":"Internal Server Error","message":"Invalid token","path":"/authors"}` for a non-empty,
non-parseable bearer token) also affects this sibling public read endpoint. No `security` requirement is
declared for `GET /books` either, so the header must either be ignored (`200`) or rejected cleanly
(`401`) — a `500` would reproduce the same defect class on a second endpoint.

### Headers
- `Authorization`: `Bearer invalid.token.value`

### Path Params
None.

### Query Params
None.

### Request Body
None.

## Expected Status Code
Not documented in the OpenAPI spec. Since no `security` requirement is declared, the header must either be
ignored (`200`) or rejected cleanly (`401`). Execute against the live API and record the actual result; if
a `500` is observed (as it was on `GET /authors`), this must be filed as a confirmed defect, not merely a
contract gap, given the precedent.

## Expected Response
Either the normal book collection, a well-formed authentication error, or (if the known defect reproduces
here) a `500` with an internal error body.

## Assertions
- Status assertion: response status code is not `5xx` (soft — flip to `test.fail()` / defect-tracking mode
  if the known `GET /authors` defect is confirmed to reproduce on this endpoint, mirroring how
  NEG-AUTHORS-GET-006 is implemented).
- Status assertion: response status code is `200` or `401` if the endpoint behaves correctly.

---

## Test Case ID
NEG-BOOKS-GET-007

## Scenario
Filter using an author's numeric `id` as the value of the `author` query parameter (e.g. `author=1`).

## Purpose
Business-validation check tied directly to the schema finding in `books-get-schema.scenario.md`: since
`RestAuthor` (the shape returned by this endpoint) never exposes an author `id`, and the `author` query
parameter is documented as `type: string` (a name filter, not an ID filter), confirm that filtering by a
numeric author `id` does **not** behave as an ID-based lookup — it can only ever be treated as a literal
string compared against author names.

### Headers
None required.

### Path Params
None.

### Query Params
- `author`: `1` (a known seeded author's numeric `id`, sent as the string `"1"`).

### Request Body
None.

## Expected Status Code
200 OK (the parameter is documented as an untyped string filter; a numeric-looking string is still a valid
string).

## Expected Response
A JSON array containing only books whose author `firstName`/`lastName` literally contains the substring
`"1"` (almost certainly unrelated to the author whose `id` is `1`), or an empty array — **not** the book(s)
actually authored by the author with `id: 1`, unless that author's name coincidentally contains the digit.

## Assertions
- Status assertion: response status code equals 200 (not an error) — a numeric string is still a
  syntactically valid `string` query value.
- Business assertion: the result set is determined by literal substring matching against author name
  fields, not by resolving `"1"` to the author record with `id: 1` — confirming that this endpoint
  provides no author-ID-based filtering path, consistent with `RestAuthor` never exposing `id`.

# Notes
- The OpenAPI spec documents only the `200` response for `GET /books`. No `400`, `401`, `403`, `404`, or
  `500` responses are declared for this operation. Per the "never assume undocumented behavior" rule, none
  of the test cases in this file assert a specific documented error status code — they instead capture
  actual behavior and flag deviations (especially `5xx` server errors) as robustness/contract-gap findings
  for the API team.
- **NEG-BOOKS-GET-006 is a targeted regression check, not a speculative case:** the identical malformed-
  bearer-token defect is already confirmed (not hypothesized) on the sibling `GET /authors` endpoint. Since
  both endpoints declare no `security` requirement and share the same underlying framework, this is a
  high-value, low-effort check for the same defect class before assuming it is isolated to `/authors`.
- **NEG-BOOKS-GET-007 documents a business-rule/contract-gap consequence of the schema finding in
  `books-get-schema.scenario.md`:** because `RestAuthor` (used by `GET /books`) omits `id`, there is no
  way to filter this collection endpoint by author identity in an unambiguous, ID-based way — only by
  (sub-)string name matching, which is inherently ambiguous for authors sharing name fragments. This should
  be reported to the API team as a potential filtering-capability gap if ID-based author filtering is a
  desired use case.
- No authentication or authorization is documented for this endpoint (no `security` requirement, no
  `securitySchemes` component in the spec). Standard "unauthorized access" / "forbidden access" negative
  cases from the template are therefore not applicable beyond the malformed-credential robustness check
  (NEG-BOOKS-GET-006) and have been omitted rather than invented elsewhere.
- No path parameters exist for `GET /books`, so "invalid path params" and "resource not found" cases from
  the template are not applicable and have been omitted.
- No request body exists for this GET operation, so "missing required fields", "invalid field types",
  "invalid enums", "invalid formats", and "malformed JSON body" cases from the template are not applicable
  and have been omitted.
- No conflict scenarios (409), invalid state transitions, or invalid business rules apply beyond
  NEG-BOOKS-GET-007 — this is a read-only list endpoint with no state-changing side effects.
- If the API team documents error responses for this endpoint in the future (e.g. `400` for malformed
  query input), this file must be updated to assert those specific documented status codes and bodies.
