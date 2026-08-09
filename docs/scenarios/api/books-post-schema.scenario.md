# Scenario Title
POST /books — Response Schema and Contract Validation

# Endpoint Information
- Method: POST
- Endpoint: /books
- Description: `books-controller` operation `createBook`. Accepts a `CreateBookPayload` request body
  (`title` optional string; `authors` required array of unique `int64` author IDs; `year` required
  `int32`; `price` required `number` with `minimum: 0.01`, `maximum: 1000`; `available` required `int32`
  with `minimum: 1`, `maximum: 10000`) and creates a new book. This file validates the API contract only:
  status code, response shape, field types, and content-type. Business flows and negative/error handling
  are covered in the positive and negative files.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint in the OpenAPI spec (no `security` scheme is declared
  globally or on this operation).
- The `requestBody` for this operation is marked `required: true`.
- At least one existing author `id` (seeded via `POST /authors`) is available, since `CreateBookPayload`
  requires a non-empty-looking `authors` array of author IDs to build a schema-valid payload.

# Test Data
- Valid payload: `{ "title": "Moby Dick", "authors": [<existing author id>], "year": 1851, "price": 19.99, "available": 25 }`.
- Invalid payloads: N/A — this file validates the response contract, not request validation (see negative
  file).
- Auth variants: none documented — no auth header required or validated by the spec.
- Boundary values: N/A for schema validation — see positive/negative files for `price`
  (`min: 0.01`, `max: 1000`) and `available` (`min: 1`, `max: 10000`) boundary exercises.
- Reusable test values:
  - `CreateBookPayload` schema (component `#/components/schemas/CreateBookPayload`):
    - `title`: `string` (optional).
    - `authors`: `array` of `integer` (`int64`), `uniqueItems: true` (**required**) — a list of author
      **IDs**, not author objects.
    - `year`: `integer` (`int32`) (**required**, no documented min/max).
    - `price`: `number` (**required**, `minimum: 0.01`, `maximum: 1000`, both inclusive).
    - `available`: `integer` (`int32`) (**required**, `minimum: 1`, `maximum: 10000`, both inclusive).
  - Response schema (declared on `201` for `createBook`): `{ "type": "object" }` — a **generic,
    property-less object schema**, not a `$ref` to `Book`. This is a documented contract gap, identical in
    shape to the `createAuthor`/`updateAuthor` gap. See Notes.
  - `Book` schema (returned by `GET /books/{id}`, for reference when reasoning about likely response
    fields): `id` (int64), `title` (string), `year` (int32), `price` (number), `coverId` (int64),
    `available` (int32), `authors` (`uniqueItems` array of **`Author` objects** — `id`, `firstName`,
    `lastName` — not IDs). This asymmetry between the request's `authors: number[]` and the resource's
    `authors: Author[]` is a key contract point exercised below. See Notes.

# Test Cases

## Test Case ID
SCHEMA-BOOKS-POST-001

## Scenario
Validate HTTP status code for a successful POST /books call.

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
{ "title": "Moby Dick", "authors": [1], "year": 1851, "price": 19.99, "available": 25 }
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
SCHEMA-BOOKS-POST-002

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
{ "title": "Moby Dick", "authors": [1], "year": 1851, "price": 19.99, "available": 25 }
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
SCHEMA-BOOKS-POST-003

## Scenario
Validate field types of the response body when fields resembling the `Book` schema are present.

## Purpose
Confirm that if the response includes fields resembling `Book` (`id`, `title`, `year`, `price`,
`coverId`, `available` — as returned by `GET /books/{id}`), those fields conform to the expected types.
This is a soft/contract-gap check since the `201` response schema for `createBook` does not declare any
properties.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Moby Dick", "authors": [1], "year": 1851, "price": 19.99, "available": 25 }
```

## Expected Status Code
201 Created

## Expected Response
If present: `id` is an integer (int64-compatible), `title` is a string matching the request value, `year`
is an integer matching the request value, `price` is a number matching the request value, `coverId` (if
present) is an integer or `null`, `available` is an integer matching the request value.

## Assertions
- Field assertion (soft): `id`, when present, is an integer.
- Field assertion (soft): `title`, when present, is a string and matches the request value.
- Field assertion (soft): `year`, when present, is an integer and matches the request value.
- Field assertion (soft): `price`, when present, is a number and matches the request value.
- Field assertion (soft): `available`, when present, is an integer and matches the request value.
- Schema assertion: no field present on the response body violates a basic JSON type (e.g. no field
  unexpectedly returns a string where a number is implied).

---

## Test Case ID
SCHEMA-BOOKS-POST-004

## Scenario
Validate the shape of the `authors` field on the response, given the documented asymmetry between the
request schema (`authors: number[]`, a list of IDs) and the `Book` resource schema
(`authors: Author[]`, a list of `{ id, firstName, lastName }` objects).

## Purpose
Determine and record which representation (`Author` objects, raw IDs, or omitted entirely) the `201`
response actually uses for `authors`, since the response schema is generic and does not commit to either
shape. This is the single highest-value schema contract-gap finding for this endpoint.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Moby Dick", "authors": [1], "year": 1851, "price": 19.99, "available": 25 }
```

## Expected Status Code
201 Created

## Expected Response
Undocumented — the automation agent must observe and record whether `authors` (when present) is returned
as an array of full `Author` objects (matching `Book.authors`), an array of raw IDs (matching the request
shape), or is absent from the create response entirely.

## Assertions
- Schema assertion (contract-gap record, not hard failure): if `authors` is present, its element shape
  (object vs. primitive ID) is recorded and compared against both `CreateBookPayload.authors` (IDs) and
  `Book.authors` (objects) so the spec can be tightened.
- Field assertion (soft): if `authors` elements are objects, each conforms to the `Author` shape (`id`
  integer, `firstName` string, `lastName` string).
- Field assertion (soft): if `authors` elements are primitives, each is an integer equal to one of the IDs
  sent in the request.

---

## Test Case ID
SCHEMA-BOOKS-POST-005

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
{ "title": "Moby Dick", "authors": [1], "year": 1851, "price": 19.99, "available": 25 }
```

## Expected Status Code
201 Created

## Expected Response
The actual set of returned fields is recorded (expected candidates based on domain knowledge: `id`,
`title`, `year`, `price`, `coverId`, `available`, `authors`) but not enforced as a hard schema requirement.

## Assertions
- Schema assertion: response body is a JSON object (satisfies the documented empty schema).
- Schema assertion (contract-gap record, not hard failure): documents the actual keys returned so the
  OpenAPI spec can be tightened to a concrete `$ref` (e.g. `Book`) in a future revision.

---

## Test Case ID
SCHEMA-BOOKS-POST-006

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
{ "title": "Moby Dick", "authors": [1], "year": 1851, "price": 19.99, "available": 25 }
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
SCHEMA-BOOKS-POST-007

## Scenario
Validate response structure when the request omits the optional `title` field.

## Purpose
Confirm the response remains a well-formed JSON object per the documented (generic) response schema even
when `title` — the only optional property on `CreateBookPayload` — is omitted from the request.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "authors": [1], "year": 1851, "price": 19.99, "available": 25 }
```

## Expected Status Code
201 Created

## Expected Response
A JSON object; whether `title` is returned as `null`, omitted, or an empty string is undocumented and must
be observed.

## Assertions
- Status assertion: response status code equals 201.
- Schema assertion: response body is a JSON object, not `null` and not an array.

# Notes
- The `201` response for `createBook` is documented as `{ "type": "object" }` — a generic, property-less
  schema, unlike `GET /books/{id}` which returns `$ref: Book` (`id`, `title`, `year`, `price`, `coverId`,
  `available`, `authors`). This is a notable contract gap: the OpenAPI spec does not commit to the shape of
  the create response. Test cases in this file treat any field-level assertions as soft/contract-gap checks
  rather than hard schema failures, and this gap should be reported to the API team so the spec can
  reference the `Book` schema explicitly (mirrors the same gap already recorded for `createAuthor`).
- **Authors relationship asymmetry (key finding):** `CreateBookPayload.authors` is documented as
  `array<integer(int64)>` — a list of author **IDs** — while the `Book` resource's `authors` field
  (returned by `GET /books/{id}` / `GET /books`) is documented as `array<Author>` — a list of full author
  **objects** (`id`, `firstName`, `lastName`). The spec never documents the shape actually returned by
  `POST /books` itself (see the generic response schema gap above), so SCHEMA-BOOKS-POST-004 is the
  designated test to observe and record which representation is used. Automation should not assume either
  shape until this is confirmed against the live API.
- `CreateBookPayload` declares `authors`, `available`, `price`, and `year` as required, with `title` the
  only optional property. This is validated structurally in SCHEMA-BOOKS-POST-007 (title omitted) and
  functionally (missing-required-field rejection) in the negative scenarios file.
- The response media type is documented as `*/*` rather than a concrete `application/json`. Content-type
  assertions in this file check for a JSON-parseable response and record the actual header value rather
  than asserting a hardcoded `application/json` string, since the spec does not commit to that value.
- No `additionalProperties: false` is set on the response schema (there are no properties at all), so
  SCHEMA-BOOKS-POST-005 is a soft check to surface actual response shape, not a strict failure.
- This file does not validate `CreateBookPayload`'s `uniqueItems: true` constraint on `authors`, nor the
  `minimum`/`maximum` constraints on `price`/`available` — those are request-validation concerns and are
  covered in the negative scenarios file, consistent with the "schema file validates response contract
  only" rule.
