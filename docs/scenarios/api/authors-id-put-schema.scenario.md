# Scenario Title
PUT /authors/{id} — Response Schema and Contract Validation

# Endpoint Information
- Method: PUT
- Endpoint: /authors/{id}
- Description: `authors-controller` operation `updateAuthor`. Accepts a path parameter `id` (integer,
  `int64`, required) and an `UpdateAuthorPayload` request body (`firstName`, `lastName`, both optional
  strings — no `required` array declared) to update an existing author. This file validates the API
  contract only: status code, response shape, field types, and content-type. Business flows and
  negative/error handling are covered in the positive and negative files.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint in the OpenAPI spec (no `security` scheme is declared
  globally or on this operation).
- The `requestBody` for this operation is marked `required: true`, so a JSON body must be sent for the
  request to be schema-conformant (an empty JSON object `{}` is still a valid instance of
  `UpdateAuthorPayload` since none of its properties are individually required).
- An existing author record must be present (e.g. seeded via `POST /authors`) so its `id` can be used as
  the path parameter for a schema-valid call.

# Test Data
- Valid path param: `id` of a pre-existing, seeded author (integer, `int64`).
- Valid payload: `{ "firstName": "Charlotte", "lastName": "Bronte" }`.
- Invalid payloads: N/A — this file validates the response contract, not request validation (see negative
  file).
- Auth variants: none documented — no auth header required or validated by the spec.
- Boundary values: N/A — no `minLength`/`maxLength`/pattern documented on `firstName`/`lastName`.
- Reusable test values:
  - `UpdateAuthorPayload` schema (component `#/components/schemas/UpdateAuthorPayload`):
    - `firstName`: `string` (optional — no `required` array on this schema).
    - `lastName`: `string` (optional — no `required` array on this schema).
  - Response schema (declared on `200` for `updateAuthor`): `{ "type": "object" }` — a **generic,
    property-less object schema**, not a `$ref` to `Author`. This is a documented contract gap: the spec
    does not commit to which fields (e.g. `id`, `firstName`, `lastName`) are present on the response body.
    See Notes.

# Test Cases

## Test Case ID
SCHEMA-AUTHORS-PUT-001

## Scenario
Validate HTTP status code for a successful PUT /authors/{id} call.

## Purpose
Confirm the endpoint returns the documented success status code for a resource update.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```json
{ "firstName": "Charlotte", "lastName": "Bronte" }
```

## Expected Status Code
200 OK

## Expected Response
Response body is present and is a JSON object.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is of type `object` (not an array, not `null`).

---

## Test Case ID
SCHEMA-AUTHORS-PUT-002

## Scenario
Validate the top-level response structure conforms to the documented (generic) response schema.

## Purpose
Confirm the response body is a well-formed JSON object, matching the documented `{ "type": "object" }`
schema for the `200` response.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```json
{ "firstName": "Charlotte", "lastName": "Bronte" }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object. The spec does not declare any properties on this schema, so no specific fields are
contractually guaranteed.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body parses as valid JSON and is of type `object`.
- Schema assertion (soft/contract-gap): response body is not an empty object with zero informational value
  (e.g. does not return `{}` when an updated resource identifier would realistically be expected) —
  flagged as a contract-gap finding rather than a hard failure, since the spec does not require any field.

---

## Test Case ID
SCHEMA-AUTHORS-PUT-003

## Scenario
Validate field types of the response body when fields are present.

## Purpose
Confirm that if the response includes fields resembling the `Author` schema (`id`, `firstName`,
`lastName` — as returned by `GET /authors/{id}`), those fields conform to the expected types. This is a
soft/contract-gap check since the `200` response schema for `updateAuthor` does not declare any
properties.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```json
{ "firstName": "Charlotte", "lastName": "Bronte" }
```

## Expected Status Code
200 OK

## Expected Response
If present: `id` is an integer (int64-compatible) matching the path param, `firstName` is a string,
`lastName` is a string.

## Assertions
- Field assertion (soft): `id`, when present, is an integer and equals the `id` path param.
- Field assertion (soft): `firstName`, when present, is a string and matches the request value.
- Field assertion (soft): `lastName`, when present, is a string and matches the request value.
- Schema assertion: no field present on the response body violates a basic JSON type (e.g. no field
  unexpectedly returns an array or nested object where a primitive is implied).

---

## Test Case ID
SCHEMA-AUTHORS-PUT-004

## Scenario
Validate `additionalProperties` / actual response shape against the documented generic object schema.

## Purpose
Since the response schema is `{ "type": "object" }` with no `properties` and no
`additionalProperties: false`, any JSON object technically satisfies the contract. This test records the
actual field set returned so drift/gaps can be reported to the API team.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```json
{ "firstName": "Charlotte", "lastName": "Bronte" }
```

## Expected Status Code
200 OK

## Expected Response
The actual set of returned fields is recorded (expected candidates based on domain knowledge: `id`,
`firstName`, `lastName`) but not enforced as a hard schema requirement.

## Assertions
- Schema assertion: response body is a JSON object (satisfies the documented empty schema).
- Schema assertion (contract-gap record, not hard failure): documents the actual keys returned so the
  OpenAPI spec can be tightened to a concrete `$ref` (e.g. `Author`) in a future revision.

---

## Test Case ID
SCHEMA-AUTHORS-PUT-005

## Scenario
Validate the response `Content-Type` header.

## Purpose
Confirm the response is served with a JSON-compatible content type.

### Headers
`Content-Type: application/json` (request).

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```json
{ "firstName": "Charlotte", "lastName": "Bronte" }
```

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
SCHEMA-AUTHORS-PUT-006

## Scenario
Validate the `id` path parameter type constraint.

## Purpose
Confirm the documented `id` path parameter schema (`type: integer, format: int64`) so downstream negative
tests (e.g. non-numeric `id`) have a documented baseline to compare against.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id (integer, `int64`).

### Query Params
None.

### Request Body
```json
{ "firstName": "Charlotte", "lastName": "Bronte" }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object; the request succeeds because `id` conforms to the documented `integer`/`int64` schema.

## Assertions
- Status assertion: response status code equals 200 when `id` is a well-formed integer.
- Schema assertion: response body is a JSON object.

---

## Test Case ID
SCHEMA-AUTHORS-PUT-007

## Scenario
Validate response structure when the request body omits optional fields (`{}`).

## Purpose
Confirm the response remains a well-formed JSON object per the documented (generic) response schema even
when the request payload is minimal, since neither `firstName` nor `lastName` is required by
`UpdateAuthorPayload`.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded author id.

### Query Params
None.

### Request Body
```json
{}
```

## Expected Status Code
200 OK

## Expected Response
A JSON object; whether `firstName`/`lastName` are left unchanged, nulled, or omitted is undocumented and
must be observed.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is a JSON object, not `null` and not an array.

# Notes
- The `200` response for `updateAuthor` is documented as `{ "type": "object" }` — a generic, property-less
  schema, unlike `GET /authors/{id}` which returns `$ref: Author` (`id`, `firstName`, `lastName`). This is
  a notable contract gap: the OpenAPI spec does not commit to the shape of the update response. Test cases
  in this file treat any field-level assertions as soft/contract-gap checks rather than hard schema
  failures, and this gap should be reported to the API team so the spec can reference the `Author` schema
  explicitly.
- `UpdateAuthorPayload` does not declare a `required` array, so per the contract both `firstName` and
  `lastName` are optional on the request. This is validated structurally in SCHEMA-AUTHORS-PUT-007 and
  functionally in the positive scenarios file.
- The response media type is documented as `*/*` rather than a concrete `application/json`. Content-type
  assertions in this file check for a JSON-parseable response and record the actual header value rather
  than asserting a hardcoded `application/json` string, since the spec does not commit to that value.
- No `additionalProperties: false` is set on the response schema (there are no properties at all), so
  SCHEMA-AUTHORS-PUT-004 is a soft check to surface actual response shape, not a strict failure.
- The spec does not document whether `PUT` performs a full replace or a partial merge for fields omitted
  from the request body (semantically `PUT` implies full replace, but a separate `PATCH
  /authors/{id}` operation also exists in the spec). This ambiguity is not resolved by the schema alone and
  is called out again in the positive scenarios file.
