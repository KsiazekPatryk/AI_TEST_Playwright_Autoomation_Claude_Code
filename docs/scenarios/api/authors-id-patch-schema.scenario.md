# Scenario Title
PATCH /authors/{id} — Response Schema and Contract Validation

# Endpoint Information
- Method: PATCH
- Endpoint: /authors/{id}
- Description: `authors-controller` operation `partialUpdateAuthor`. Partially updates an existing author
  identified by path parameter `id`. The request body schema is documented generically as
  `type: object, additionalProperties: { type: object }` (no named properties, no `required` array). The
  response schema is documented generically as `type: object` (no `$ref` to `Author`, no properties
  listed). This file validates the API contract only: status code, response shape, path parameter
  constraints, request body constraints, and content-type — see Notes for how the underdocumented
  request/response schemas are handled.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint in the OpenAPI spec (no `security` scheme is declared
  globally or on this operation).
- At least one author exists in the system with a known, valid `id` (recommend seeding via
  `POST /authors` before running these tests, since PATCH requires an existing resource).

# Test Data
- Valid payload (per the generic documented schema — no named properties, so any object is contract-valid):
  - `{ "firstName": "UpdatedFirst" }`
  - `{ "lastName": "UpdatedLast" }`
  - `{ "firstName": "UpdatedFirst", "lastName": "UpdatedLast" }`
  - `{}` (empty object — contract-valid since no field is `required`)
- Path params:
  - `id`: `integer`, `format: int64`, required.
- Auth variants: none documented — no auth header required or validated by the spec.
- Boundary values: N/A for the request body (no numeric/length constraints documented on any field, since
  no named properties exist in the schema). For `id`: standard `int64` boundary (e.g. `1`, a large valid
  int64 value).
- Reusable test values:
  - Seeded author `id` (obtained via prior `POST /authors` or `GET /authors`).
  - `Author` component schema (used only as a reasonable assumption for response shape — see Notes):
    - `id`: `integer`, `format: int64`
    - `firstName`: `string`
    - `lastName`: `string`

# Test Cases

## Test Case ID
SCHEMA-AUTHORS-PATCH-001

## Scenario
Validate HTTP status code for a successful PATCH /authors/{id} call.

## Purpose
Confirm the endpoint returns the documented success status code for a valid partial update.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing author `id`.

### Query Params
None.

### Request Body
`{ "firstName": "UpdatedFirst" }`

## Expected Status Code
200 OK

## Expected Response
Response body is present.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is parseable JSON.

---

## Test Case ID
SCHEMA-AUTHORS-PATCH-002

## Scenario
Validate top-level response structure is a JSON object.

## Purpose
Confirm the response conforms to the documented `type: object` shape (no array, no primitive).

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing author `id`.

### Query Params
None.

### Request Body
`{ "firstName": "UpdatedFirst", "lastName": "UpdatedLast" }`

## Expected Status Code
200 OK

## Expected Response
A single JSON object (not an array, not `null`).

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body type is `object`.
- Schema assertion: response body is not `null` and not an array.

---

## Test Case ID
SCHEMA-AUTHORS-PATCH-003

## Scenario
Validate the `id` path parameter format constraint (`int64`).

## Purpose
Confirm the endpoint accepts an `id` matching the documented `integer, format: int64` type.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid `int64` integer (e.g. an existing seeded author id).

### Query Params
None.

### Request Body
`{}`

## Expected Status Code
200 OK

## Expected Response
Response body is a JSON object.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: `id` path parameter of type `integer` is accepted without a type-coercion error.

---

## Test Case ID
SCHEMA-AUTHORS-PATCH-004

## Scenario
Validate response fields, if present, match the likely `Author` field types (assumption-based check).

## Purpose
Confirm that when `id`, `firstName`, `lastName` appear in the response, their types match the `Author`
component schema, even though the PATCH operation itself does not formally reference `Author` in its
response schema.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing author `id`.

### Query Params
None.

### Request Body
`{ "firstName": "SchemaCheckFirst", "lastName": "SchemaCheckLast" }`

## Expected Status Code
200 OK

## Expected Response
A JSON object; if `id`, `firstName`, `lastName` fields are present, they match `integer`, `string`,
`string` respectively.

## Assertions
- Field assertion: `id`, when present, is an integer (int64-compatible).
- Field assertion: `firstName`, when present, is a string.
- Field assertion: `lastName`, when present, is a string.
- Schema assertion: no observed field violates a JSON-primitive expectation (object/array only where
  reasonably expected).

---

## Test Case ID
SCHEMA-AUTHORS-PATCH-005

## Scenario
Validate request body accepts the generic documented shape (`additionalProperties: object`).

## Purpose
Confirm the API does not reject a request body solely for not matching a named schema, since none is
documented (the schema only declares `additionalProperties: { type: object }`).

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing author `id`.

### Query Params
None.

### Request Body
`{ "firstName": "UpdatedFirst" }`

## Expected Status Code
200 OK

## Expected Response
Response body is a JSON object.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: no `additionalProperties`/schema-mismatch rejection occurs for a plausible field name.

---

## Test Case ID
SCHEMA-AUTHORS-PATCH-006

## Scenario
Validate the response `Content-Type` header.

## Purpose
Confirm the response is served with a JSON-compatible content type.

### Headers
`Content-Type: application/json` (request).

### Path Params
- `id`: a valid, existing author `id`.

### Query Params
None.

### Request Body
`{ "firstName": "UpdatedFirst" }`

## Expected Status Code
200 OK

## Expected Response
Response `Content-Type` header value is recorded and validated as JSON-parseable.

## Assertions
- Header assertion: `Content-Type` response header is present.
- Note: the spec declares the response media type as `*/*` (wildcard), not a concrete `application/json`
  — see Notes for how this ambiguity is handled.

# Notes
- The request body schema for this operation is `type: object, additionalProperties: { type: object }`
  with no named properties and no `required` array. This is an underdocumented/generic schema — it does
  not explicitly confirm that `firstName`/`lastName` (from the `Author`/`UpdateAuthorPayload` schemas) are
  the actual patchable fields, only that the API team modeled this as an arbitrary key-value map (likely a
  Spring/Jackson generic `Map<String, Object>` binding). Test cases assume `firstName`/`lastName` as the
  realistic patchable fields based on the sibling `Author` and `UpdateAuthorPayload` schemas, but this is
  an explicit assumption, not a documented guarantee — flagged as a contract gap for the API team.
- The response schema is documented as a bare `type: object` with no properties and no `$ref` to `Author`.
  SCHEMA-AUTHORS-PATCH-004 assumes the response mirrors the `Author` shape (consistent with the sibling
  `GET /authors/{id}` and `PUT /authors/{id}` operations) but this must be confirmed against the running
  API and is not a hard contract requirement per the spec as written.
- The response media type is documented as `*/*` rather than a concrete `application/json`. Content-type
  assertions check for a JSON-parseable response rather than asserting a hardcoded `application/json`
  string.
- No `404 Not Found` response is documented for a non-existent `id` on this operation (only `200` is
  declared) — not covered here; see the negative scenarios file for handling of this contract gap.
- No pagination or headers metadata is documented for this endpoint, consistent with a single-resource
  update operation.
