# Scenario Title
PATCH /books/{id} — Response Schema and Contract Validation

# Endpoint Information
- Method: PATCH
- Endpoint: /books/{id}
- Description: `books-controller` operation `partialUpdateBook`. Partially updates an existing book
  identified by path parameter `id` (integer, `int64`, required). The request body schema is documented
  generically as `type: object, additionalProperties: { type: object }` (no named properties, no
  `required` array) — identical in shape to `PATCH /authors/{id}` (`partialUpdateAuthor`). The response
  schema is documented generically as `type: object` (no `$ref` to `Book`, no properties listed). This file
  validates the API contract only: status code, response shape, path parameter constraints, and
  content-type — see Notes for how the underdocumented request/response schemas are handled.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint in the OpenAPI spec (no `security` scheme is declared
  globally or on this operation).
- A known book record exists (e.g. seeded via `POST /books`) with a known `id`, since `PATCH` requires an
  existing resource.
- At least one existing author `id` (seeded via `POST /authors`) is available, since the realistic
  patchable `authors` field (per the sibling `UpdateBookPayload`/`Book` schemas) references author IDs.

# Test Data
- Valid payloads (per the generic documented schema — no named properties, so any object is
  contract-valid):
  - `{ "title": "UpdatedTitle" }`
  - `{ "year": 1999 }`
  - `{ "price": 15.50 }`
  - `{ "available": 10 }`
  - `{ "authors": [<existing author id>] }`
  - `{ "title": "UpdatedTitle", "year": 1999, "price": 15.50, "available": 10, "authors": [<existing author id>] }`
  - `{}` (empty object — contract-valid since no field is `required`)
- Path params:
  - `id`: `integer`, `format: int64`, required.
- Auth variants: none documented — no auth header required or validated by the spec.
- Boundary values: N/A for schema validation (no numeric constraints are declared on the generic PATCH
  request schema itself) — see the positive/negative files, which borrow `UpdateBookPayload`'s documented
  `price` (`min: 1`, `max: 10000`) and `available` (`min: 1`, `max: 10000`) bounds as a realistic (not
  contractually enforced on PATCH) baseline.
- Reusable test values:
  - Seeded book `id` (obtained via prior `POST /books` or `GET /books`).
  - Seeded author `id` (obtained via prior `POST /authors` or `GET /authors`).
  - `Book` component schema (used as a reasonable assumption for response shape — see Notes): `id`
    (int64), `title` (string), `year` (int32), `price` (number), `coverId` (int64), `available` (int32),
    `authors` (`uniqueItems` array of `Author` objects — `id`, `firstName`, `lastName`).
  - `UpdateBookPayload` schema (sibling `PUT /books/{id}` request schema, used only as a realistic
    reference for likely patchable fields and bounds, not as a formal contract for this operation):
    `title` (string, optional), `authors` (`int64[]`, unique, required on PUT), `year` (`int32`, required
    on PUT), `price` (`number`, required on PUT, `min: 1`, `max: 10000`), `available` (`int32`, required
    on PUT, `min: 1`, `max: 10000`).

# Test Cases

## Test Case ID
SCHEMA-BOOKS-PATCH-001

## Scenario
Validate HTTP status code for a successful PATCH /books/{id} call.

## Purpose
Confirm the endpoint returns the documented success status code for a valid partial update.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "title": "UpdatedTitle" }`

## Expected Status Code
200 OK

## Expected Response
Response body is present.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is parseable JSON.

---

## Test Case ID
SCHEMA-BOOKS-PATCH-002

## Scenario
Validate top-level response structure is a JSON object.

## Purpose
Confirm the response conforms to the documented `type: object` shape (no array, no primitive).

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "title": "UpdatedTitle", "price": 15.50 }`

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
SCHEMA-BOOKS-PATCH-003

## Scenario
Validate the `id` path parameter format constraint (`int64`).

## Purpose
Confirm the endpoint accepts an `id` matching the documented `integer, format: int64` type.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid `int64` integer (e.g. an existing seeded book id).

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
SCHEMA-BOOKS-PATCH-004

## Scenario
Validate response fields, if present, match the likely `Book` field types (assumption-based check).

## Purpose
Confirm that when `id`, `title`, `year`, `price`, `coverId`, `available` appear in the response, their
types match the `Book` component schema, even though the PATCH operation itself does not formally
reference `Book` in its response schema.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "title": "SchemaCheckTitle", "year": 2001, "price": 12.99, "available": 8 }`

## Expected Status Code
200 OK

## Expected Response
A JSON object; if present, `id`/`coverId` are integers, `title` is a string, `year` is an integer,
`price` is a number, `available` is an integer.

## Assertions
- Field assertion: `id`, when present, is an integer (int64-compatible) and equals the `id` path param.
- Field assertion: `title`, when present, is a string.
- Field assertion: `year`, when present, is an integer.
- Field assertion: `price`, when present, is a number.
- Field assertion: `available`, when present, is an integer.
- Field assertion: `coverId`, when present, is an integer or `null`.
- Schema assertion: no observed field violates a JSON-primitive expectation (object/array only where
  reasonably expected, e.g. `authors`).

---

## Test Case ID
SCHEMA-BOOKS-PATCH-005

## Scenario
Validate the shape of the `authors` field on the response, given the same documented request/resource
asymmetry already identified for this resource (`authors: number[]` on the request side vs.
`authors: Author[]` on the `Book` resource side).

## Purpose
Determine and record which representation (`Author` objects, raw IDs, or omitted entirely) the `200`
response actually uses for `authors` when the request patches that field, since the response schema for
`partialUpdateBook` is generic and does not commit to either shape. This mirrors the identical finding
already recorded in `books-id-put-schema.scenario.md` (SCHEMA-BOOKS-PUT-004) and
`books-post-schema.scenario.md` (SCHEMA-BOOKS-POST-004). As of this file's authoring, a
`books-get-schema.scenario.md` file confirming the live `GET /books/{id}` shape does not yet exist in this
batch (being generated concurrently); this file relies on the `Book` component's documented `$ref: Author`
array definition as the baseline, consistent with the approach already taken in the PUT/POST schema files.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "authors": [1] }`

## Expected Status Code
200 OK

## Expected Response
Undocumented — the automation agent must observe and record whether `authors` (when present) is returned
as an array of full `Author` objects (matching `Book.authors`), an array of raw IDs (matching the request
shape), or is absent from the patch response entirely.

## Assertions
- Schema assertion (contract-gap record, not hard failure): if `authors` is present, its element shape
  (object vs. primitive ID) is recorded and compared against both the realistic patch-input shape (IDs)
  and `Book.authors` (objects) so the spec can be tightened.
- Field assertion (soft): if `authors` elements are objects, each conforms to the `Author` shape (`id`
  integer, `firstName` string, `lastName` string).
- Field assertion (soft): if `authors` elements are primitives, each is an integer equal to one of the IDs
  sent in the request.

---

## Test Case ID
SCHEMA-BOOKS-PATCH-006

## Scenario
Validate request body accepts the generic documented shape (`additionalProperties: object`).

## Purpose
Confirm the API does not reject a request body solely for not matching a named schema, since none is
documented (the schema only declares `additionalProperties: { type: object }`).

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "title": "UpdatedTitle" }`

## Expected Status Code
200 OK

## Expected Response
Response body is a JSON object.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: no `additionalProperties`/schema-mismatch rejection occurs for a plausible field name.

---

## Test Case ID
SCHEMA-BOOKS-PATCH-007

## Scenario
Validate `additionalProperties` / actual response shape against the documented generic object schema.

## Purpose
Since the response schema is `{ "type": "object" }` with no `properties` and no
`additionalProperties: false`, any JSON object technically satisfies the contract. This test records the
actual field set returned so drift/gaps can be reported to the API team.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "title": "UpdatedTitle", "year": 1999, "price": 15.50, "available": 10, "authors": [1] }`

## Expected Status Code
200 OK

## Expected Response
The actual set of returned fields is recorded (expected candidates based on domain knowledge: `id`,
`title`, `year`, `price`, `coverId`, `available`, `authors`) but not enforced as a hard schema requirement.

## Assertions
- Schema assertion: response body is a JSON object (satisfies the documented empty schema).
- Schema assertion (contract-gap record, not hard failure): documents the actual keys returned so the
  OpenAPI spec can be tightened to a concrete `$ref` (e.g. `Book`) in a future revision.

---

## Test Case ID
SCHEMA-BOOKS-PATCH-008

## Scenario
Validate the response `Content-Type` header.

## Purpose
Confirm the response is served with a JSON-compatible content type.

### Headers
`Content-Type: application/json` (request).

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "title": "UpdatedTitle" }`

## Expected Status Code
200 OK

## Expected Response
Response `Content-Type` header value is recorded and validated as JSON-parseable.

## Assertions
- Header assertion: `Content-Type` response header is present.
- Note: the spec declares the response media type as `*/*` (wildcard), not a concrete `application/json`
  — see Notes for how this ambiguity is handled.

---

## Test Case ID
SCHEMA-BOOKS-PATCH-009

## Scenario
Validate response structure when the request patches only a single field out of the full realistic
`Book` field set (`title`, `year`, `price`, `available`, `authors`).

## Purpose
Confirm the response remains a well-formed JSON object per the documented (generic) response schema
regardless of how many/which fields are included in the partial-update payload.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: a valid, existing book `id`.

### Query Params
None.

### Request Body
`{ "available": 10 }`

## Expected Status Code
200 OK

## Expected Response
A JSON object; whether unpatched fields (e.g. `title`, `year`, `price`, `authors`) are echoed back
unchanged, omitted, or nulled is undocumented and must be observed.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is a JSON object, not `null` and not an array.

# Notes
- The request body schema for this operation is `type: object, additionalProperties: { type: object }`
  with no named properties and no `required` array — identical in shape to `PATCH /authors/{id}`. This is
  an underdocumented/generic schema — it does not explicitly confirm that `title`/`year`/`price`/
  `available`/`authors` (from the sibling `Book`/`UpdateBookPayload` schemas) are the actual patchable
  fields, only that the API team modeled this as an arbitrary key-value map (likely a Spring/Jackson
  generic `Map<String, Object>` binding). Test cases assume these five fields as the realistic patchable
  set based on the sibling `Book` and `UpdateBookPayload` schemas, but this is an explicit assumption, not
  a documented guarantee — flagged as a contract gap for the API team.
- The response schema is documented as a bare `type: object` with no properties and no `$ref` to `Book`.
  SCHEMA-BOOKS-PATCH-004 assumes the response mirrors the `Book` shape (consistent with the sibling
  `GET /books/{id}` and `PUT /books/{id}` operations) but this must be confirmed against the running API
  and is not a hard contract requirement per the spec as written.
- **Authors relationship shape (key finding, carried over from sibling files):** whether `authors` is
  returned as raw IDs or full `Author` objects on this operation's response is undocumented.
  SCHEMA-BOOKS-PATCH-005 is the designated test to observe and record this. This is the same open question
  already flagged in `books-post-schema.scenario.md` (SCHEMA-BOOKS-POST-004) and
  `books-id-put-schema.scenario.md` (SCHEMA-BOOKS-PUT-004); neither of those files' own observation has been
  independently confirmed as of this writing (their assertions are themselves marked soft/contract-gap,
  pending live execution), and a `books-get-schema.scenario.md` file does not yet exist in this batch to
  independently resolve it either. This file therefore treats the question as still open and records its
  own observation rather than assuming an answer from a sibling file.
- **`authors`/referential integrity is out of scope for this schema file:** whether patching `authors` with
  a non-existent author `id` is accepted, rejected, or silently drops the invalid ID is a request-validation
  / business-rule concern, not a response-schema concern, and is covered in the negative scenarios file
  (mirroring `NEG-BOOKS-POST-009` in `books-post-negative.scenario.md`).
- The response media type is documented as `*/*` rather than a concrete `application/json`. Content-type
  assertions check for a JSON-parseable response rather than asserting a hardcoded `application/json`
  string.
- No `404 Not Found` response is documented for a non-existent `id` on this operation (only `200` is
  declared) — not covered here; see the negative scenarios file for handling of this contract gap.
- `coverId` is not included among the realistic patchable fields for this operation, since the spec
  documents a dedicated `PATCH /books/{id}/cover` (`multipart/form-data`) operation for managing the book
  cover. Whether submitting `coverId` via this generic PATCH body has any effect is an undocumented
  robustness concern, covered in the negative scenarios file rather than here.
- No pagination or headers metadata is documented for this endpoint, consistent with a single-resource
  partial-update operation.
