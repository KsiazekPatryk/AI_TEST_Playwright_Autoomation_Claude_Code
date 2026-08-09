# Scenario Title
GET /books — Response Schema and Contract Validation

# Endpoint Information
- Method: GET
- Endpoint: /books
- Description: `books-controller` operation `getAll`. Returns a collection of books, optionally filtered
  by the query parameters `title` and `author` (both optional strings; validated separately in the
  positive/negative files). This file validates the API contract only: status code, response shape, field
  types, and content-type. Business flows and negative/error handling are covered in the positive and
  negative files.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint in the OpenAPI spec (no `security` scheme is declared
  globally or on this operation).
- At least one book exists in the system (e.g. seeded via `POST /books`) so the response array is
  non-empty for structural assertions (an empty-array case is still schema-valid and is covered as its own
  test case).
- For the cross-endpoint comparison test case, the `id` of at least one book returned by `GET /books` is
  known so it can be re-fetched via `GET /books/{id}`.

# Test Data
- Valid payload: N/A — GET request, no request body.
- Query params: none required for schema validation (base call with no query params).
- Auth variants: none documented — no auth header required or validated by the spec.
- Boundary values: N/A (no path params, no enums, no numeric constraints on this operation's parameters).
- Reusable test values:
  - **`RestBook` schema** (component `#/components/schemas/RestBook`) — this is the schema actually
    referenced by `GET /books` (`"200": { "content": { "*/*": { "schema": { "type": "array", "items": {
    "$ref": "#/components/schemas/RestBook" } } } } }`):
    - `id`: `integer`, `format: int64`
    - `title`: `string`
    - `year`: `integer`, `format: int32`
    - `price`: `number`
    - `coverUrl`: `string`
    - `available`: `integer`, `format: int32`
    - `authors`: `array`, `uniqueItems: true`, items `$ref: #/components/schemas/RestAuthor`
  - **`RestAuthor` schema** (component `#/components/schemas/RestAuthor`):
    - `firstName`: `string`
    - `lastName`: `string`
    - **No `id` property is declared on `RestAuthor`.**
  - None of `RestBook`'s or `RestAuthor`'s properties are declared in a `required` array in the spec.
  - For contrast (see "Key Finding" in Notes): `GET /books/{id}` (operation `getById`) returns
    `$ref: #/components/schemas/Book`, a **different** component: `id`, `title`, `year`, `price`,
    `coverId` (`integer`, `int64`), `available`, `authors` (array of `$ref: Author` — `id`, `firstName`,
    `lastName`). `Book`/`Author` are not used by the collection endpoint under test in this file.

# Test Cases

## Test Case ID
SCHEMA-BOOKS-GET-001

## Scenario
Validate HTTP status code for a successful GET /books call.

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
SCHEMA-BOOKS-GET-002

## Scenario
Validate top-level response structure is an array of `RestBook` objects.

## Purpose
Confirm the response conforms to `type: array, items: $ref RestBook` as documented for `getAll`.

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
A JSON array where every element is an object matching the `RestBook` schema shape (`id`, `title`, `year`,
`price`, `coverUrl`, `available`, `authors`).

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array (not an object, not a paginated wrapper — the spec defines a
  raw array with no pagination metadata).
- Schema assertion: every element in the array is a JSON object (not a primitive).

---

## Test Case ID
SCHEMA-BOOKS-GET-003

## Scenario
Validate each `RestBook` item's scalar field types.

## Purpose
Confirm each array element matches the documented `RestBook` component schema field types for `id`,
`title`, `year`, `price`, `coverUrl`, `available`.

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
Each item contains, when present: `id` (integer), `title` (string), `year` (integer), `price` (number),
`coverUrl` (string), `available` (integer).

## Assertions
- Field assertion: `id`, when present, is an integer (int64-compatible).
- Field assertion: `title`, when present, is a string.
- Field assertion: `year`, when present, is an integer (int32-compatible).
- Field assertion: `price`, when present, is a number.
- Field assertion: `coverUrl`, when present, is a string.
- Field assertion: `available`, when present, is an integer (int32-compatible).
- Schema assertion: no field violates its documented JSON type.

---

## Test Case ID
SCHEMA-BOOKS-GET-004

## Scenario
Validate the shape of the `authors` field on each `RestBook` item — **the key contract finding for this
endpoint.**

## Purpose
Confirm that `RestBook.authors` is an array of `RestAuthor` objects containing **only `firstName` and
`lastName`, with no `id` field**, and explicitly record that this is a *different* shape from the `Book`
resource returned by `GET /books/{id}` (which nests full `Author` objects, `id` included). This closes the
open question left in `books-id-put-schema.scenario.md` / `books-id-patch-schema.scenario.md` about
whether `authors` is returned as IDs or full objects — but resolves it with an important nuance (see Notes:
"Key Finding").

### Headers
None required.

### Path Params
None.

### Query Params
None.

### Request Body
None.

## Expected Response
Each `authors` array element is a JSON object with exactly `firstName` (string) and `lastName` (string);
**no `id` property is present**, confirmed both by the `RestAuthor` component definition and by a live call
(`GET /books` returned, e.g., `"authors":[{"firstName":"Robert","lastName":"C.Martin"}]` — no `id` key).

## Expected Status Code
200 OK

## Assertions
- Schema assertion: `authors` is present and is an array.
- Field assertion: every element of `authors` is a JSON object containing `firstName` (string) and
  `lastName` (string).
- Field assertion (contract confirmation, not a contract-gap): every element of `authors` does **not**
  contain an `id` field — this is the documented `RestAuthor` shape, not an omission to flag, but it must
  be asserted explicitly since it differs from the sibling `Author` schema used elsewhere in the API.
- Schema assertion: `authors` respects `uniqueItems: true` (no two elements are deep-equal).

---

## Test Case ID
SCHEMA-BOOKS-GET-005

## Scenario
Validate the `coverUrl` field's shape and contrast it with `GET /books/{id}`'s `coverId` field.

## Purpose
Confirm `RestBook.coverUrl` is a `string` (a full, dereferenceable URL), distinct from `Book.coverId`
(an `integer`/`int64` identifier) returned by the single-resource `GET /books/{id}` endpoint for the same
underlying book — a second concrete example of the collection endpoint using a materially different
response schema (`RestBook`) than the single-resource endpoint (`Book`).

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
`coverUrl`, when present, is a string resembling a URL (e.g.
`"http://bookstoreapi.up.railway.app/uploads/{id}/file"`, as observed live). No `coverId` field is present
on `RestBook` items.

## Assertions
- Field assertion: `coverUrl`, when present, is a string.
- Schema assertion: `RestBook` items do not contain a `coverId` field (that field belongs to the `Book`
  schema used by `GET /books/{id}`, not to `RestBook`).

---

## Test Case ID
SCHEMA-BOOKS-GET-006

## Scenario
Cross-endpoint consistency check — compare the same book's representation between `GET /books` (collection
item) and `GET /books/{id}` (single resource) to directly confirm the schema divergence.

## Purpose
Provide a concrete, executable confirmation that `GET /books` and `GET /books/{id}` intentionally (or at
least observably) return two different schemas (`RestBook` vs. `Book`) for the same underlying entity, and
that the scalar fields shared by both schemas remain consistent between the two representations.

### Headers
None required.

### Path Params
- `id` (for the follow-up `GET /books/{id}` call): the `id` of a book returned in the `GET /books`
  collection response.

### Query Params
None (for the `GET /books` call).

### Request Body
None.

## Expected Status Code
200 OK (for both calls).

## Expected Response
For the same `id`: `id`, `title`, `year`, `price`, and `available` match exactly between the `GET /books`
item and the `GET /books/{id}` object. `coverUrl` (collection) and `coverId` (single resource) both
reference the same underlying cover but in different representations. `authors` (collection, `RestAuthor[]`
— no `id`) and `authors` (single resource, `Author[]` — `id` present) describe the same author(s) but with
different field sets.

## Assertions
- Field assertion: `id`, `title`, `year`, `price`, `available` are identical between the two
  representations of the same book.
- Schema assertion (key contract confirmation): the `GET /books` item's `authors[].{firstName,lastName}`
  values match the `GET /books/{id}` object's `authors[].{firstName,lastName}` values one-to-one, but only
  the `GET /books/{id}` representation exposes `authors[].id`.
- Schema assertion: `GET /books` items expose `coverUrl` (string) and never `coverId`; `GET /books/{id}`
  exposes `coverId` (integer) and never `coverUrl`.

---

## Test Case ID
SCHEMA-BOOKS-GET-007

## Scenario
Validate `additionalProperties` behavior of `RestBook` and `RestAuthor` items.

## Purpose
Confirm whether the API returns fields beyond the documented `RestBook`/`RestAuthor` schemas.

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
Each `RestBook` item contains only the documented fields (`id`, `title`, `year`, `price`, `coverUrl`,
`available`, `authors`), and each `authors` element contains only `firstName`/`lastName`, or the automation
agent records any additional undocumented fields as a contract-gap finding.

## Assertions
- Schema assertion (soft/contract-gap): no unexpected top-level fields on `RestBook` items beyond the
  documented set (spec does not set `additionalProperties: false` on `RestBook`).
- Schema assertion (soft/contract-gap): no unexpected fields on `authors` elements beyond `firstName`/
  `lastName` (spec does not set `additionalProperties: false` on `RestAuthor`).

---

## Test Case ID
SCHEMA-BOOKS-GET-008

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
- Note: the spec declares the response media type as `*/*` (wildcard), not a concrete `application/json`
  — see Notes for how this ambiguity is handled.

---

## Test Case ID
SCHEMA-BOOKS-GET-009

## Scenario
Validate schema conformance when the result set is empty.

## Purpose
Confirm an empty result still returns a well-formed, schema-valid empty array (not `null`, not an error).

### Headers
None required.

### Path Params
None.

### Query Params
`title` set to a value guaranteed to match zero books (confirmed live: `title=zzzznonexistentbookzzzz`
returns `[]`).

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
- **Key Finding — `GET /books` (collection) and `GET /books/{id}` (single resource) use two different,
  non-interchangeable response schemas for what is conceptually the same resource:**
  - `GET /books` → `array<RestBook>`, where `RestBook.authors` is `array<RestAuthor>` and `RestAuthor` has
    **only `firstName` and `lastName` — no `id`**. `RestBook` also uses `coverUrl` (a full URL string).
  - `GET /books/{id}` → `Book`, where `Book.authors` is `array<Author>` and `Author` has `id`, `firstName`,
    `lastName`. `Book` uses `coverId` (an `integer`/`int64` identifier) instead of `coverUrl`.
  - This was confirmed both from the OpenAPI spec (`RestBook`/`RestAuthor` vs. `Book`/`Author` components)
    and by direct live calls to the deployed API: `GET /books` returned
    `{"id":5,"title":"Clean Architecture", ..., "coverUrl":"http://bookstoreapi.up.railway.app/uploads/5/file",
    "authors":[{"firstName":"Robert","lastName":"C.Martin"}]}`, while `GET /books/5` returned
    `{"id":5,"title":"Clean Architecture", ..., "coverId":5,
    "authors":[{"id":8,"firstName":"Robert","lastName":"C.Martin"}]}` for the same book.
  - **This partially closes, and partially refines, the open question left in
    `books-id-put-schema.scenario.md` and `books-id-patch-schema.scenario.md`.** Those files correctly
    observe that the `Book` component schema documents `authors` as `array<Author>` (objects, `id`
    included) — that assumption is now confirmed correct, but **only for `GET /books/{id}`**. It does
    **not** hold for `GET /books` (this endpoint): the collection response's `authors` field never exposes
    an author `id`, only `firstName`/`lastName`. Automation should not assume a book's collection-listing
    `authors` entries can be used to derive an author `id` (e.g. to chain into `GET /authors/{id}` or
    `DELETE /authors/{id}`) — a separate lookup (typically `GET /books/{id}` or `GET /authors`) is required
    for that. This asymmetry is itself a contract-gap worth flagging to the API team: two schemas
    (`RestBook`/`Book`) describing the same entity with diverging field sets is a maintenance and
    consumer-confusion risk, independent of whether it is intentional (e.g. a deliberate "list projection"
    vs. "detail view" design).
  - A follow-up note referencing this finding could be added to `books-id-put-schema.scenario.md` and
    `books-id-patch-schema.scenario.md` (their `PUT`/`PATCH` `200` responses are still documented only as
    generic `{ "type": "object" }`, so this finding does not resolve *their* primary open question — what
    shape `PUT`/`PATCH` themselves return — it only confirms that `GET /books/{id}`'s `Book.authors`
    assumption was correct while showing it cannot be generalized to `GET /books`). Updating those files is
    not part of this task.
- Neither `RestBook` nor `RestAuthor` declares a `required` array, so strictly per the OpenAPI contract none
  of their properties are guaranteed to be present or non-null. Test cases assert on type-when-present
  rather than assuming all fields are mandatory. This should be flagged to the API team as a contract-gap
  for a resource identifier (`id`) that is realistically expected to always be present on `RestBook`.
- The response media type is documented as `*/*` rather than a concrete `application/json`. Content-type
  assertions in this file check for a JSON-parseable response and record the actual header value rather
  than asserting a hardcoded `application/json` string, since the spec does not commit to that value.
- No pagination metadata (e.g. `totalElements`, `page`, `size`) is documented for this endpoint — the
  response is a plain array. If pagination is added later, this file must be updated.
- `RestBook.additionalProperties` / `RestAuthor.additionalProperties` are not set to `false` in the spec, so
  extra undocumented fields are not a hard contract violation; SCHEMA-BOOKS-GET-007 is a soft check to
  surface drift, not a strict failure.
