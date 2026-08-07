# Scenario Title
GET /authors — Response Schema and Contract Validation

# Endpoint Information
- Method: GET
- Endpoint: /authors
- Description: `authors-controller` operation `getAll_1`. Returns a collection of authors. Supports optional
  `firstName` and `lastName` query parameters (validated separately in the positive/negative files). This
  file validates the API contract only: status code, response shape, field types, and content-type.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint in the OpenAPI spec (no `security` scheme is declared
  globally or on this operation).
- At least one author exists in the system so the response array is non-empty for structural assertions
  (an empty-array case is still schema-valid and is covered as its own test case).

# Test Data
- Valid payload: N/A — GET request, no request body.
- Query params: none required for schema validation (base call with no query params).
- Auth variants: none documented — no auth header required or validated by the spec.
- Boundary values: N/A (no path params, no enums, no numeric constraints on this operation).
- Reusable test values:
  - `Author` schema (component `#/components/schemas/Author`):
    - `id`: `integer`, `format: int64`
    - `firstName`: `string`
    - `lastName`: `string`
  - None of the `Author` properties are declared in a `required` array in the spec.

# Test Cases

## Test Case ID
SCHEMA-AUTHORS-GET-001

## Scenario
Validate HTTP status code for a successful GET /authors call.

## Purpose
Confirm the endpoint returns the documented success status code.

### Headers
None required (no documented auth).

### Path Params
None.

### Query Params
None.

### Request Body
None (GET request).

## Expected Status Code
200 OK

## Expected Response
Response body is present and is a JSON array.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is of type `array`.

---

## Test Case ID
SCHEMA-AUTHORS-GET-002

## Scenario
Validate top-level response structure is an array of `Author` objects.

## Purpose
Confirm the response conforms to `type: array, items: $ref Author` as documented.

### Headers
None required.

### Path Params
None.

### Query Params
None.

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
A JSON array where every element is an object matching the `Author` schema shape
(`id`, `firstName`, `lastName`).

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array (not an object, not paginated wrapper — spec defines a raw
  array with no pagination metadata).
- Schema assertion: every element in the array is a JSON object (not a primitive).

---

## Test Case ID
SCHEMA-AUTHORS-GET-003

## Scenario
Validate each `Author` item's field types.

## Purpose
Confirm each array element matches the documented `Author` component schema field types.

### Headers
None required.

### Path Params
None.

### Query Params
None.

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
Each item contains `id` (integer), `firstName` (string), `lastName` (string) when present.

## Assertions
- Field assertion: `id`, when present, is an integer (int64-compatible).
- Field assertion: `firstName`, when present, is a string.
- Field assertion: `lastName`, when present, is a string.
- Schema assertion: no field violates its documented JSON type.

---

## Test Case ID
SCHEMA-AUTHORS-GET-004

## Scenario
Validate `additionalProperties` behavior of `Author` items.

## Purpose
Confirm whether the API returns fields beyond the documented `Author` schema (`id`, `firstName`,
`lastName`).

### Headers
None required.

### Path Params
None.

### Query Params
None.

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
Each array item contains only the documented fields (`id`, `firstName`, `lastName`), or the automation
agent records any additional undocumented fields as a contract-gap finding.

## Assertions
- Schema assertion: no unexpected top-level fields on `Author` items beyond `id`, `firstName`, `lastName`
  (note: the spec does not set `additionalProperties: false` on `Author`, so this is a soft/contract-gap
  check, not a hard failure — see Notes).

---

## Test Case ID
SCHEMA-AUTHORS-GET-005

## Scenario
Validate the response `Content-Type` header.

## Purpose
Confirm the response is served with a JSON-compatible content type.

### Headers
None required in the request.

### Path Params
None.

### Query Params
None.

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
Response `Content-Type` header value is recorded and validated as JSON-parseable.

## Assertions
- Header assertion: `Content-Type` response header is present.
- Note: the spec declares the response media type as `*/*` (wildcard), not a concrete
  `application/json` — see Notes for how this ambiguity is handled.

---

## Test Case ID
SCHEMA-AUTHORS-GET-006

## Scenario
Validate schema conformance when the result set is empty.

## Purpose
Confirm an empty result still returns a well-formed, schema-valid empty array (not `null`, not an error).

### Headers
None required.

### Path Params
None.

### Query Params
`firstName` set to a value guaranteed to match zero authors (e.g. a random/non-existent name).

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
`[]` — an empty JSON array.

## Assertions
- Status assertion: response status code equals 200 (not 404).
- Schema assertion: response body is an array with `length === 0`.
- Schema assertion: response body is not `null`.

# Notes
- The `Author` component schema does not declare a `required` array, so strictly per the OpenAPI contract
  none of `id`, `firstName`, `lastName` are guaranteed to be present or non-null. Test cases assert on
  type-when-present rather than assuming all fields are mandatory. This should be flagged to the API team
  as a contract-gap for a resource identifier (`id`) that is realistically expected to always be present.
- The response media type is documented as `*/*` rather than a concrete `application/json`. Content-type
  assertions in this file check for a JSON-parseable response and record the actual header value rather
  than asserting a hardcoded `application/json` string, since the spec does not commit to that value.
- No pagination metadata (e.g. `totalElements`, `page`, `size`) is documented for this endpoint — the
  response is a plain array. If pagination is added later, this file must be updated.
- `Author.additionalProperties` is not set to `false` in the spec, so extra undocumented fields are not a
  hard contract violation; TC SCHEMA-AUTHORS-GET-004 is a soft check to surface drift, not a strict
  failure.
