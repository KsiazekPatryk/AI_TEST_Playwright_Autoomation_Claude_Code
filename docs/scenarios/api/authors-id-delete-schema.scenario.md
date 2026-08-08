# Scenario Title
DELETE /authors/{id} — Response Schema and Contract Validation

# Endpoint Information
- Method: DELETE
- Endpoint: /authors/{id}
- Description: `authors-controller` operation `deleteById_1`. Accepts a required path parameter `id`
  (integer, `int64`) and deletes the corresponding author. The only documented response is `204 No
  Content`, with **no `content` object declared at all** for that status (unlike, for example, `DELETE
  /orders/{id}` in the same spec, whose `204` response documents `content: {"*/*": {"schema": {"type":
  "string"}}}`). This file validates the API contract only: status code and the absence of a response
  body/schema. Business flows (actual deletion effect, data consistency) and error/negative handling are
  covered in the positive and negative files.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint in the OpenAPI spec (no `security` scheme is declared
  globally or on this operation).
- No `requestBody` is declared for this operation, so no request body is applicable.
- An existing author record must be present (e.g. seeded via `POST /authors`) so its `id` can be used as
  the path parameter for a schema-valid call. Because `DELETE` removes the resource, a fresh author must
  be re-seeded for each schema test case that requires a valid, still-existing `id` (deletion is
  destructive, so the resource cannot be reused across test cases).

# Test Data
- Valid path param: `id` of a pre-existing, freshly seeded author (integer, `int64`).
- Request body: not applicable — the operation has no `requestBody` in the spec.
- Auth variants: none documented — no auth header required or validated by the spec.
- Boundary values: not applicable — there is no request payload or response schema with declared fields
  to bound.
- Reusable test values:
  - `id` path parameter schema: `type: integer, format: int64, required: true`.
  - `204` response: no `content` object declared — the spec commits to an empty body, not merely an
    unspecified one.

# Test Cases

## Test Case ID
SCHEMA-AUTHORS-DELETE-001

## Scenario
Validate HTTP status code for a successful delete of an existing author.

## Purpose
Confirm the endpoint returns the documented success status code for resource deletion.

### Headers
None required (no `Content-Type` needed, as there is no request body).

### Path Params
- `id`: a pre-existing, freshly seeded author id.

### Query Params
None.

### Request Body
(none — no `requestBody` declared for this operation)

## Expected Status Code
204 No Content

## Expected Response
No response body.

## Assertions
- Status assertion: response status code equals 204.
- Schema assertion: response body is empty (zero-length / no content).

---

## Test Case ID
SCHEMA-AUTHORS-DELETE-002

## Scenario
Validate the response body is empty, consistent with the spec declaring no `content` object for `204`.

## Purpose
Confirm no JSON (or any) payload is returned, matching the documented absence of a response schema —
distinct from an endpoint that documents `204` with an explicit (even if generic) content schema.

### Headers
None required.

### Path Params
- `id`: a pre-existing, freshly seeded author id.

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content

## Expected Response
An empty response body; there is nothing to parse as JSON.

## Assertions
- Status assertion: response status code equals 204.
- Schema assertion: response body length is 0 and does not contain a parseable JSON payload.

---

## Test Case ID
SCHEMA-AUTHORS-DELETE-003

## Scenario
Validate response headers for the `204` response are consistent with an empty body.

## Purpose
Since no content schema is declared, confirm headers do not indicate a body is present (e.g.
`Content-Length: 0` or the header is omitted, per standard `204` semantics).

### Headers
None required.

### Path Params
- `id`: a pre-existing, freshly seeded author id.

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content

## Expected Response
No response body; header values are recorded.

## Assertions
- Header assertion: if a `Content-Length` header is present, its value is `0`.
- Header assertion (record, not hard-required): `Content-Type` is not documented for this response — if
  present, its value is recorded as a contract-gap observation, since `204` by HTTP semantics and the
  spec's own (empty) content declaration should not carry a body/content type.

---

## Test Case ID
SCHEMA-AUTHORS-DELETE-004

## Scenario
Validate the `id` path parameter type constraint (`integer`, `int64`) as a baseline for schema-conformant
requests.

## Purpose
Confirm a well-formed integer `id` conforms to the documented path parameter schema and yields the
documented success outcome, providing a baseline for negative type-mismatch tests in the negative
scenarios file.

### Headers
None required.

### Path Params
- `id`: a pre-existing, freshly seeded author id (integer, `int64`).

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content

## Expected Response
No response body; the request succeeds because `id` conforms to the documented `integer`/`int64` schema.

## Assertions
- Status assertion: response status code equals 204 when `id` is a well-formed integer.
- Schema assertion: response body is empty.

---

## Test Case ID
SCHEMA-AUTHORS-DELETE-005

## Scenario
Confirm no response schema drift across repeated calls to the documented no-content contract.

## Purpose
Since `204` declares no schema at all, any accidental introduction of a response body on subsequent calls
(e.g. an error message body appearing on a technically-successful status) would be undocumented behavior.
This test records actual behavior for a second, independent deletion of a different freshly seeded author.

### Headers
None required.

### Path Params
- `id`: a second, independently seeded author id (different from prior test cases).

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content

## Expected Response
No response body, consistent with SCHEMA-AUTHORS-DELETE-001 through 004.

## Assertions
- Status assertion: response status code equals 204.
- Schema assertion: response body is empty, consistent across repeated, independent successful calls.

# Notes
- The `204` response for `deleteById_1` declares **no `content` object at all**, which is a stricter,
  more explicit contract than simply "no schema specified" — it commits to an empty body. This is worth
  noting because `DELETE /orders/{id}` (`deleteOrder`) in the same spec documents `204` **with** a
  `content: {"*/*": {"schema": {"type": "string"}}}` block, an inconsistency between two structurally
  similar delete operations in the same document. This is flagged as a spec-consistency observation for
  the API team; it does not change the assertions for this endpoint, which follow only what is documented
  for `deleteById_1` itself.
- No `requestBody` is declared for this operation, so there are no request-body schema assertions in this
  file (unlike the `PUT`/`PATCH` counterparts for `/authors/{id}`).
- No authentication/authorization scheme is declared for this endpoint or globally in the spec, so no
  auth-header assertions apply.
- The only explicit request-side contract constraint is the `id` path parameter's `type: integer, format:
  int64, required: true`, exercised in SCHEMA-AUTHORS-DELETE-004 and used as the baseline for negative
  path-parameter type-mismatch cases in the negative scenarios file.
