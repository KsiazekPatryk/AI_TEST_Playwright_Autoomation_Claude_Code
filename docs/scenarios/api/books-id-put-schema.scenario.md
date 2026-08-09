# Scenario Title
PUT /books/{id} — Response Schema and Contract Validation

# Endpoint Information
- Method: PUT
- Endpoint: /books/{id}
- Description: `books-controller` operation `updateBook`. Accepts a path parameter `id` (integer, `int64`,
  required) and an `UpdateBookPayload` request body (`title` optional string; `authors` required, unique
  array of `int64` author IDs; `year` required `int32`; `price` required `number` with `minimum: 1`,
  `maximum: 10000`; `available` required `int32` with `minimum: 1`, `maximum: 10000`) to update an existing
  book. This file validates the API contract only: status code, response shape, field types, and
  content-type. Business flows and negative/error handling are covered in the positive and negative files.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint in the OpenAPI spec (no `security` scheme is declared
  globally or on this operation).
- The `requestBody` for this operation is marked `required: true`.
- An existing book record must be present (e.g. seeded via `POST /books`) so its `id` can be used as the
  path parameter for a schema-valid call.
- At least one existing author `id` (seeded via `POST /authors`) is available, since `UpdateBookPayload`
  requires a non-empty-looking `authors` array of author IDs to build a schema-valid payload.

# Test Data
- Valid path param: `id` of a pre-existing, seeded book (integer, `int64`).
- Valid payload: `{ "title": "Moby Dick (Revised Edition)", "authors": [<existing author id>], "year": 1851, "price": 24.99, "available": 15 }`.
- Invalid payloads: N/A — this file validates the response contract, not request validation (see negative
  file).
- Auth variants: none documented — no auth header required or validated by the spec.
- Boundary values: N/A for schema validation — see positive/negative files for `price`
  (`min: 1`, `max: 10000`) and `available` (`min: 1`, `max: 10000`) boundary exercises.
- Reusable test values:
  - `UpdateBookPayload` schema (component `#/components/schemas/UpdateBookPayload`):
    - `title`: `string` (optional).
    - `authors`: `array` of `integer` (`int64`), `uniqueItems: true` (**required**) — a list of author
      **IDs**, not author objects.
    - `year`: `integer` (`int32`) (**required**, no documented min/max).
    - `price`: `number` (**required**, `minimum: 1`, `maximum: 10000`, both inclusive). **Note:** this
      differs from `CreateBookPayload.price` (`minimum: 0.01`, `maximum: 1000`) — see Notes.
    - `available`: `integer` (`int32`) (**required**, `minimum: 1`, `maximum: 10000`, both inclusive) —
      identical bounds to `CreateBookPayload.available`.
  - Response schema (declared on `200` for `updateBook`): `{ "type": "object" }` — a **generic,
    property-less object schema**, not a `$ref` to `Book`. This is the same documented contract gap already
    recorded for `createBook` (`books-post-schema.scenario.md`) and `updateAuthor`
    (`authors-id-put-schema.scenario.md`). See Notes.
  - `Book` schema (returned by `GET /books/{id}`, for reference when reasoning about likely response
    fields): `id` (int64), `title` (string), `year` (int32), `price` (number), `coverId` (int64),
    `available` (int32), `authors` (`uniqueItems` array of **`Author` objects** — `id`, `firstName`,
    `lastName` — not IDs), as documented directly on the `Book` component. This asymmetry between the
    request's `authors: number[]` and the resource's `authors: Author[]` is a key contract point exercised
    below, mirroring the finding already recorded in `books-post-schema.scenario.md`
    (SCHEMA-BOOKS-POST-004). A sibling `books-get-schema.scenario.md` does not yet exist in this batch to
    independently confirm the live `GET` shape, so this file treats the `Book` component definition itself
    as the documented baseline rather than re-opening it as unknown.

# Test Cases

## Test Case ID
SCHEMA-BOOKS-PUT-001

## Scenario
Validate HTTP status code for a successful PUT /books/{id} call.

## Purpose
Confirm the endpoint returns the documented success status code for a resource update.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded book id.

### Query Params
None.

### Request Body
```json
{ "title": "Moby Dick (Revised Edition)", "authors": [1], "year": 1851, "price": 24.99, "available": 15 }
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
SCHEMA-BOOKS-PUT-002

## Scenario
Validate the top-level response structure conforms to the documented (generic) response schema.

## Purpose
Confirm the response body is a well-formed JSON object, matching the documented `{ "type": "object" }`
schema for the `200` response.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded book id.

### Query Params
None.

### Request Body
```json
{ "title": "Moby Dick (Revised Edition)", "authors": [1], "year": 1851, "price": 24.99, "available": 15 }
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
SCHEMA-BOOKS-PUT-003

## Scenario
Validate field types of the response body when fields resembling the `Book` schema are present.

## Purpose
Confirm that if the response includes fields resembling `Book` (`id`, `title`, `year`, `price`,
`coverId`, `available` — as returned by `GET /books/{id}`), those fields conform to the expected types.
This is a soft/contract-gap check since the `200` response schema for `updateBook` does not declare any
properties.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded book id.

### Query Params
None.

### Request Body
```json
{ "title": "Moby Dick (Revised Edition)", "authors": [1], "year": 1851, "price": 24.99, "available": 15 }
```

## Expected Status Code
200 OK

## Expected Response
If present: `id` is an integer matching the path param, `title` is a string matching the request value,
`year` is an integer matching the request value, `price` is a number matching the request value, `coverId`
(if present) is an integer or `null`, `available` is an integer matching the request value.

## Assertions
- Field assertion (soft): `id`, when present, is an integer and equals the `id` path param.
- Field assertion (soft): `title`, when present, is a string and matches the request value.
- Field assertion (soft): `year`, when present, is an integer and matches the request value.
- Field assertion (soft): `price`, when present, is a number and matches the request value.
- Field assertion (soft): `available`, when present, is an integer and matches the request value.
- Schema assertion: no field present on the response body violates a basic JSON type.

---

## Test Case ID
SCHEMA-BOOKS-PUT-004

## Scenario
Validate the shape of the `authors` field on the response, given the documented asymmetry between the
request schema (`authors: number[]`, a list of IDs) and the `Book` resource schema (`authors: Author[]`, a
list of `{ id, firstName, lastName }` objects).

## Purpose
Determine and record which representation (`Author` objects, raw IDs, or omitted entirely) the `200`
response actually uses for `authors`, since the response schema is generic and does not commit to either
shape. This is the single highest-value schema contract-gap finding for this endpoint, and is also the key
prerequisite for confirming whether updating a book's `authors` association is even observable from the
`PUT` response itself (vs. only via a follow-up `GET`).

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded book id.

### Query Params
None.

### Request Body
```json
{ "title": "Moby Dick (Revised Edition)", "authors": [1], "year": 1851, "price": 24.99, "available": 15 }
```

## Expected Status Code
200 OK

## Expected Response
Undocumented — the automation agent must observe and record whether `authors` (when present) is returned
as an array of full `Author` objects (matching `Book.authors`), an array of raw IDs (matching the request
shape), or is absent from the update response entirely.

## Assertions
- Schema assertion (contract-gap record, not hard failure): if `authors` is present, its element shape
  (object vs. primitive ID) is recorded and compared against both `UpdateBookPayload.authors` (IDs) and
  `Book.authors` (objects) so the spec can be tightened.
- Field assertion (soft): if `authors` elements are objects, each conforms to the `Author` shape (`id`
  integer, `firstName` string, `lastName` string).
- Field assertion (soft): if `authors` elements are primitives, each is an integer equal to one of the IDs
  sent in the request.

---

## Test Case ID
SCHEMA-BOOKS-PUT-005

## Scenario
Validate `additionalProperties` / actual response shape against the documented generic object schema.

## Purpose
Since the response schema is `{ "type": "object" }` with no `properties` and no
`additionalProperties: false`, any JSON object technically satisfies the contract. This test records the
actual field set returned so drift/gaps can be reported to the API team.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded book id.

### Query Params
None.

### Request Body
```json
{ "title": "Moby Dick (Revised Edition)", "authors": [1], "year": 1851, "price": 24.99, "available": 15 }
```

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
SCHEMA-BOOKS-PUT-006

## Scenario
Validate the response `Content-Type` header.

## Purpose
Confirm the response is served with a JSON-compatible content type.

### Headers
`Content-Type: application/json` (request).

### Path Params
- `id`: a pre-existing, seeded book id.

### Query Params
None.

### Request Body
```json
{ "title": "Moby Dick (Revised Edition)", "authors": [1], "year": 1851, "price": 24.99, "available": 15 }
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
SCHEMA-BOOKS-PUT-007

## Scenario
Validate the `id` path parameter type constraint.

## Purpose
Confirm the documented `id` path parameter schema (`type: integer, format: int64`) so downstream negative
tests (e.g. non-numeric `id`) have a documented baseline to compare against.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded book id (integer, `int64`).

### Query Params
None.

### Request Body
```json
{ "title": "Moby Dick (Revised Edition)", "authors": [1], "year": 1851, "price": 24.99, "available": 15 }
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
SCHEMA-BOOKS-PUT-008

## Scenario
Validate response structure when the request omits the optional `title` field.

## Purpose
Confirm the response remains a well-formed JSON object per the documented (generic) response schema even
when `title` — the only optional property on `UpdateBookPayload` — is omitted from the request.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: a pre-existing, seeded book id.

### Query Params
None.

### Request Body
```json
{ "authors": [1], "year": 1851, "price": 24.99, "available": 15 }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object; whether `title` is returned as `null`, omitted, unchanged, or cleared is undocumented and
must be observed.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is a JSON object, not `null` and not an array.

# Notes
- The `200` response for `updateBook` is documented as `{ "type": "object" }` — a generic, property-less
  schema, unlike `GET /books/{id}` which returns `$ref: Book` (`id`, `title`, `year`, `price`, `coverId`,
  `available`, `authors`). This is a notable contract gap, identical in shape to the one already recorded
  for `createBook` (`books-post-schema.scenario.md`) and `updateAuthor` (`authors-id-put-schema.scenario.md`).
  Test cases in this file treat any field-level assertions as soft/contract-gap checks rather than hard
  schema failures.
- **Authors relationship asymmetry (key finding):** `UpdateBookPayload.authors` is documented as
  `array<integer(int64)>` — a list of author **IDs** — while the `Book` resource's `authors` field
  (returned by `GET /books/{id}` / `GET /books`) is documented as `array<Author>` — a list of full author
  **objects** (`id`, `firstName`, `lastName`). The spec never documents the shape actually returned by
  `PUT /books/{id}` itself (see the generic response schema gap above), so SCHEMA-BOOKS-PUT-004 is the
  designated test to observe and record which representation is used. This mirrors SCHEMA-BOOKS-POST-004 in
  `books-post-schema.scenario.md`. A `books-get-schema.scenario.md` file does not currently exist in this
  batch to independently confirm the live `GET /books/{id}` `authors` shape; this file relies on the `Book`
  component's documented `$ref: Author` array definition rather than treating it as unresolved.
- **`price` bounds differ between create and update (contract asymmetry):** `UpdateBookPayload.price` is
  `minimum: 1, maximum: 10000`, while `CreateBookPayload.price` (used by `POST /books`) is
  `minimum: 0.01, maximum: 1000`. This is a documented, real difference in the spec (not an assumption) and
  is exercised at both endpoints' respective boundaries in their own positive/negative files — do not reuse
  `CreateBookPayload` boundary values (e.g. `0.01`, `1000`) when testing `PUT /books/{id}`.
- `UpdateBookPayload` declares `authors`, `available`, `price`, and `year` as required, with `title` the
  only optional property — identical required-field shape to `CreateBookPayload`. This is validated
  structurally in SCHEMA-BOOKS-PUT-008 (title omitted) and functionally (missing-required-field rejection)
  in the negative scenarios file. Unlike `UpdateAuthorPayload` (where *all* fields are optional, creating a
  full-replace-vs-partial-merge ambiguity explored in `authors-id-put-positive.scenario.md`), only `title`
  is optional here, so that ambiguity is far narrower for this endpoint — see the positive file.
- The response media type is documented as `*/*` rather than a concrete `application/json`. Content-type
  assertions in this file check for a JSON-parseable response and record the actual header value rather
  than asserting a hardcoded `application/json` string, since the spec does not commit to that value.
- No `additionalProperties: false` is set on the response schema (there are no properties at all), so
  SCHEMA-BOOKS-PUT-005 is a soft check to surface actual response shape, not a strict failure.
- This file does not validate `UpdateBookPayload`'s `uniqueItems: true` constraint on `authors`, nor the
  `minimum`/`maximum` constraints on `price`/`available` — those are request-validation concerns and are
  covered in the negative scenarios file, consistent with the "schema file validates response contract
  only" rule.
