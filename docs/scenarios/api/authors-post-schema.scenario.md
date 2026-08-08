# Scenario Title
POST /authors — Response Schema and Contract Validation

# Endpoint Information
- Method: POST
- Endpoint: /authors
- Description: `authors-controller` operation `createAuthor`. Accepts a `CreateAuthorPayload` request
  body (`firstName`, `lastName`, both optional strings — no `required` array declared) and creates a new
  author. This file validates the API contract only: status code, response shape, field types, and
  content-type. Business flows and negative/error handling are covered in the positive and negative files.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint in the OpenAPI spec (no `security` scheme is declared
  globally or on this operation).
- The `requestBody` for this operation is marked `required: true`, so a JSON body must be sent for the
  request to be schema-conformant (an empty JSON object `{}` is still a valid instance of
  `CreateAuthorPayload` since none of its properties are individually required).

# Test Data
- Valid payload: `{ "firstName": "Jane", "lastName": "Austen" }`.
- Invalid payloads: N/A — this file validates the response contract, not request validation (see negative
  file).
- Auth variants: none documented — no auth header required or validated by the spec.
- Boundary values: N/A — no `minLength`/`maxLength`/pattern documented on `firstName`/`lastName`.
- Reusable test values:
  - `CreateAuthorPayload` schema (component `#/components/schemas/CreateAuthorPayload`):
    - `firstName`: `string` (optional — no `required` array on this schema).
    - `lastName`: `string` (optional — no `required` array on this schema).
  - Response schema (declared on `201` for `createAuthor`): `{ "type": "object" }` — a **generic,
    property-less object schema**, not a `$ref` to `Author`. This is a documented contract gap: the spec
    does not commit to which fields (e.g. `id`, `firstName`, `lastName`) are present on the response body.
    See Notes.

# Test Cases

## Test Case ID
SCHEMA-AUTHORS-POST-001

## Scenario
Validate HTTP status code for a successful POST /authors call.

## Purpose
Confirm the endpoint returns the documented success status code for resource creation.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "firstName": "Jane", "lastName": "Austen" }
```

## Expected Status Code
201 Created

## Expected Response
Response body is present and is a JSON object.

## Assertions
- Status assertion: response status code equals 201.
- Schema assertion: response body is of type `object` (not an array, not `null`).

---

## Test Case ID
SCHEMA-AUTHORS-POST-002

## Scenario
Validate the top-level response structure conforms to the documented (generic) response schema.

## Purpose
Confirm the response body is a well-formed JSON object, matching the documented `{ "type": "object" }`
schema for the `201` response.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "firstName": "Jane", "lastName": "Austen" }
```

## Expected Status Code
201 Created

## Expected Response
A JSON object. The spec does not declare any properties on this schema, so no specific fields are
contractually guaranteed.

## Assertions
- Status assertion: response status code equals 201.
- Schema assertion: response body parses as valid JSON and is of type `object`.
- Schema assertion (soft/contract-gap): response body is not an empty object with zero informational value
  (e.g. does not return `{}` when a created resource identifier would realistically be expected) — flagged
  as a contract-gap finding rather than a hard failure, since the spec does not require any field.

---

## Test Case ID
SCHEMA-AUTHORS-POST-003

## Scenario
Validate field types of the response body when fields are present.

## Purpose
Confirm that if the response includes fields resembling the `Author` schema (`id`, `firstName`,
`lastName` — as returned by `GET /authors` and `GET /authors/{id}`), those fields conform to the expected
types. This is a soft/contract-gap check since the `201` response schema for `createAuthor` does not
declare any properties.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "firstName": "Jane", "lastName": "Austen" }
```

## Expected Status Code
201 Created

## Expected Response
If present: `id` is an integer (int64-compatible), `firstName` is a string, `lastName` is a string.

## Assertions
- Field assertion (soft): `id`, when present, is an integer.
- Field assertion (soft): `firstName`, when present, is a string and matches the request value.
- Field assertion (soft): `lastName`, when present, is a string and matches the request value.
- Schema assertion: no field present on the response body violates a basic JSON type (e.g. no field
  unexpectedly returns an array or nested object where a primitive is implied).

---

## Test Case ID
SCHEMA-AUTHORS-POST-004

## Scenario
Validate `additionalProperties` / actual response shape against the documented generic object schema.

## Purpose
Since the response schema is `{ "type": "object" }` with no `properties` and no
`additionalProperties: false`, any JSON object technically satisfies the contract. This test records the
actual field set returned so drift/gaps can be reported to the API team.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "firstName": "Jane", "lastName": "Austen" }
```

## Expected Status Code
201 Created

## Expected Response
The actual set of returned fields is recorded (expected candidates based on domain knowledge: `id`,
`firstName`, `lastName`) but not enforced as a hard schema requirement.

## Assertions
- Schema assertion: response body is a JSON object (satisfies the documented empty schema).
- Schema assertion (contract-gap record, not hard failure): documents the actual keys returned so the
  OpenAPI spec can be tightened to a concrete `$ref` (e.g. `Author`) in a future revision.

---

## Test Case ID
SCHEMA-AUTHORS-POST-005

## Scenario
Validate the response `Content-Type` header.

## Purpose
Confirm the response is served with a JSON-compatible content type.

### Headers
`Content-Type: application/json` (request).

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "firstName": "Jane", "lastName": "Austen" }
```

## Expected Status Code
201 Created

## Expected Response
Response `Content-Type` header value is recorded and validated as JSON-parseable.

## Assertions
- Header assertion: `Content-Type` response header is present.
- Note: the spec declares the response media type as `*/*` (wildcard), not a concrete
  `application/json` — see Notes for how this ambiguity is handled.

---

## Test Case ID
SCHEMA-AUTHORS-POST-006

## Scenario
Validate response structure when the request omits optional fields (`{}`).

## Purpose
Confirm the response remains a well-formed JSON object per the documented (generic) response schema even
when the request payload is minimal, since neither `firstName` nor `lastName` is required by
`CreateAuthorPayload`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{}
```

## Expected Status Code
201 Created

## Expected Response
A JSON object; whether `firstName`/`lastName` are returned as `null`, omitted, or empty strings is
undocumented and must be observed.

## Assertions
- Status assertion: response status code equals 201.
- Schema assertion: response body is a JSON object, not `null` and not an array.

# Notes
- The `201` response for `createAuthor` is documented as `{ "type": "object" }` — a generic, property-less
  schema, unlike `GET /authors` and `GET /authors/{id}` which return `$ref: Author` (`id`, `firstName`,
  `lastName`). This is a notable contract gap: the OpenAPI spec does not commit to the shape of the create
  response. Test cases in this file treat any field-level assertions as soft/contract-gap checks rather
  than hard schema failures, and this gap should be reported to the API team so the spec can reference the
  `Author` schema explicitly.
- `CreateAuthorPayload` does not declare a `required` array, so per the contract both `firstName` and
  `lastName` are optional on the request. This is validated structurally in SCHEMA-AUTHORS-POST-006 and
  functionally in the positive scenarios file.
- The response media type is documented as `*/*` rather than a concrete `application/json`. Content-type
  assertions in this file check for a JSON-parseable response and record the actual header value rather
  than asserting a hardcoded `application/json` string, since the spec does not commit to that value.
- No `additionalProperties: false` is set on the response schema (there are no properties at all), so
  SCHEMA-AUTHORS-POST-004 is a soft check to surface actual response shape, not a strict failure.
