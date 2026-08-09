# Scenario Title
PUT /books/{id} — Positive Update Scenarios

# Endpoint Information
- Method: PUT
- Endpoint: /books/{id}
- Description: `books-controller` operation `updateBook`. Updates an existing book identified by the path
  parameter `id` (integer, `int64`, required) using an `UpdateBookPayload` request body: `title` (optional
  string), `authors` (required, unique array of existing author `int64` IDs), `year` (required `int32`),
  `price` (required `number`, `1`–`10000` inclusive), `available` (required `int32`, `1`–`10000`
  inclusive). Returns `200 OK` on success.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint.
- A known book record exists (e.g. seeded via `POST /books`) with a known `id`, so its `id` can be used as
  the path parameter for update scenarios.
- At least two, ideally three, existing author records are seeded via `POST /authors` beforehand, so
  scenarios that reassign a book's `authors` association can reference multiple distinct, real author IDs.
- `GET /books/{id}` is available and used for data-consistency verification steps after each update.
- Unlike `UpdateAuthorPayload` (where every field is optional), `UpdateBookPayload` requires `authors`,
  `year`, `price`, and `available` — only `title` is optional. This narrows the full-replace-vs-partial-merge
  ambiguity explored for `PUT /authors/{id}` down to the `title` field only; every scenario below still
  supplies all four required fields.

# Test Data
- Valid payload (all fields, single author, happy path): `{ "title": "Moby Dick (Revised Edition)", "authors": [<seeded author id A>], "year": 1851, "price": 24.99, "available": 15 }`.
- Valid payload (reassign to a different author): `{ "title": "Moby Dick (Revised Edition)", "authors": [<seeded author id B>], "year": 1851, "price": 24.99, "available": 15 }`.
- Valid payload (expand to multiple unique authors): `{ "title": "Good Omens (Anniversary Edition)", "authors": [<author id 1>, <author id 2>], "year": 1990, "price": 19.50, "available": 20 }`.
- Valid payload (reduce a multi-author book back to a single author): `{ "title": "Good Omens (Anniversary Edition)", "authors": [<author id 1>], "year": 1990, "price": 19.50, "available": 20 }`.
- Valid payload (optional `title` omitted): `{ "authors": [<seeded author id>], "year": 2001, "price": 12.99, "available": 8 }`.
- Boundary payloads:
  - `price` at documented minimum: `1`.
  - `price` at documented maximum: `10000`.
  - `available` at documented minimum: `1`.
  - `available` at documented maximum: `10000`.
- Auth variants: none documented — call without any auth header.
- Reusable test values:
  - `UpdateBookPayload` request shape: `title` (string, optional), `authors` (int64[], required, unique),
    `year` (int32, required), `price` (number, required, min 1/max 10000 — note this differs from
    `CreateBookPayload`'s min 0.01/max 1000), `available` (int32, required, min 1/max 10000).
  - `Book` shape (for verification via GET): `id`, `title`, `year`, `price`, `coverId`, `available`,
    `authors` (array of `Author` objects).

# Test Cases

## Test Case ID
POS-BOOKS-PUT-001

## Scenario
Update an existing book with a fully populated, valid payload (happy path).

## Purpose
Confirm the endpoint successfully updates an existing book when all required fields plus the optional
`title` are provided with valid values, for a valid `id`.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded book.

### Query Params
None.

### Request Body
```json
{ "title": "Moby Dick (Revised Edition)", "authors": [1], "year": 1851, "price": 24.99, "available": 15 }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated book.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is a JSON object.
- Business assertion: a subsequent `GET /books/{id}` for the same `id` returns matching `title`, `year`,
  `price`, and `available`, confirming the update was persisted.
- Business assertion: the book's `id` is unchanged by the update.

---

## Test Case ID
POS-BOOKS-PUT-002

## Scenario
Reassign a book's `authors` association from its current author to a different, existing author.

## Purpose
Confirm the endpoint allows changing which author(s) a book is associated with via `PUT` — the primary
question this file is designed to answer for the `authors` relationship, since the spec does not explicitly
call out authors-association mutability beyond typing `authors` as a required `int64[]`.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded book currently associated with author A.

### Query Params
None.

### Request Body
```json
{ "title": "Moby Dick (Revised Edition)", "authors": [2], "year": 1851, "price": 24.99, "available": 15 }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated book.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is a JSON object.
- Business assertion: a subsequent `GET /books/{id}` returns an `authors` array containing author B (`id:
  2`) and **no longer** containing author A — confirming the association was replaced, not merged/appended.

---

## Test Case ID
POS-BOOKS-PUT-003

## Scenario
Expand a book's `authors` association from a single author to multiple, unique existing authors.

## Purpose
Confirm the endpoint correctly re-associates a book with more than one author, exercising the
`uniqueItems: true` array constraint on `authors` with a valid (non-duplicate), growing set.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded book currently associated with a single author.

### Query Params
None.

### Request Body
```json
{ "title": "Good Omens (Anniversary Edition)", "authors": [1, 2], "year": 1990, "price": 19.50, "available": 20 }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated book.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is a JSON object.
- Business assertion: `GET /books/{id}` for the updated book returns an `authors` array containing both
  referenced authors, each resolved to their full `Author` details (`id`, `firstName`, `lastName`) as
  documented on the `Book` resource.

---

## Test Case ID
POS-BOOKS-PUT-004

## Scenario
Reduce a book's `authors` association from multiple authors back down to a single author.

## Purpose
Confirm the endpoint correctly removes a previously associated author when the updated `authors` array no
longer includes it — the inverse of POS-BOOKS-PUT-003.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of the book updated in POS-BOOKS-PUT-003 (currently associated with authors `[1, 2]`).

### Query Params
None.

### Request Body
```json
{ "title": "Good Omens (Anniversary Edition)", "authors": [1], "year": 1990, "price": 19.50, "available": 20 }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated book.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is a JSON object.
- Business assertion: `GET /books/{id}` for the updated book returns an `authors` array containing only
  author `1`, with author `2` no longer present.

---

## Test Case ID
POS-BOOKS-PUT-005

## Scenario
Update a book without the optional `title` field.

## Purpose
Confirm the endpoint accepts a payload omitting `title`, since it is the only property not declared in
`UpdateBookPayload.required`.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded book.

### Query Params
None.

### Request Body
```json
{ "authors": [1], "year": 2001, "price": 12.99, "available": 8 }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated book, with `title` left unchanged, cleared/`null`, or omitted
(actual behavior observed, since the spec does not define handling for an omitted optional field on
update).

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is a JSON object.
- Business assertion: the book is retrievable via `GET /books/{id}` with `year`, `price`, and `available`
  matching the request, and the observed `title` representation (unchanged vs. cleared) recorded.

---

## Test Case ID
POS-BOOKS-PUT-006

## Scenario
Update a book with `price` at the documented minimum boundary (`1`).

## Purpose
Confirm the inclusive lower boundary of `UpdateBookPayload.price` (`minimum: 1`, `exclusiveMinimum: false`)
is accepted. Note this boundary is `1`, not `0.01` as on `CreateBookPayload` — the two schemas are not
interchangeable.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded book.

### Query Params
None.

### Request Body
```json
{ "title": "Penny Paperback", "authors": [1], "year": 2010, "price": 1, "available": 5 }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated book with `price` equal to `1`.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: the persisted `price` (verified via `GET /books/{id}`) equals `1`.

---

## Test Case ID
POS-BOOKS-PUT-007

## Scenario
Update a book with `price` at the documented maximum boundary (`10000`).

## Purpose
Confirm the inclusive upper boundary of `UpdateBookPayload.price` (`maximum: 10000`,
`exclusiveMaximum: false`) is accepted.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded book.

### Query Params
None.

### Request Body
```json
{ "title": "Rare First Edition", "authors": [1], "year": 1920, "price": 10000, "available": 1 }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated book with `price` equal to `10000`.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: the persisted `price` (verified via `GET /books/{id}`) equals `10000`.

---

## Test Case ID
POS-BOOKS-PUT-008

## Scenario
Update a book with `available` at the documented minimum boundary (`1`).

## Purpose
Confirm the inclusive lower boundary of `UpdateBookPayload.available` (`minimum: 1`) is accepted.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded book.

### Query Params
None.

### Request Body
```json
{ "title": "Last Copy", "authors": [1], "year": 2015, "price": 12.00, "available": 1 }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated book with `available` equal to `1`.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: the persisted `available` (verified via `GET /books/{id}`) equals `1`.

---

## Test Case ID
POS-BOOKS-PUT-009

## Scenario
Update a book with `available` at the documented maximum boundary (`10000`).

## Purpose
Confirm the inclusive upper boundary of `UpdateBookPayload.available` (`maximum: 10000`) is accepted.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded book.

### Query Params
None.

### Request Body
```json
{ "title": "Mass Market Reprint", "authors": [1], "year": 2020, "price": 5.00, "available": 10000 }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated book with `available` equal to `10000`.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: the persisted `available` (verified via `GET /books/{id}`) equals `10000`.

---

## Test Case ID
POS-BOOKS-PUT-010

## Scenario
Data consistency check — a book updated via `PUT /books/{id}` reflects the new values, including a changed
`authors` association, on subsequent retrieval.

## Purpose
Confirm data persistence and consistency between the update and read operations for this resource, and
confirm how the request-side `authors: number[]` (IDs) is represented on the read side as
`authors: Author[]` (objects) per the `Book` schema, after an update.

### Headers
`Content-Type: application/json` (for the update call).

### Path Params
- `id`: id of a pre-existing, seeded book.

### Query Params
None.

### Request Body
```json
{ "title": "Data Consistency Test Book", "authors": [1, 2], "year": 1999, "price": 39.99, "available": 3 }
```

## Expected Status Code
200 OK (for the `PUT`); 200 OK (for the verification `GET /books/{id}`).

## Expected Response
`PUT` returns a JSON object; `GET /books/{id}` subsequently returns a `Book` with matching `title`, `year`,
`price`, `available`, and an `authors` array resolving the submitted author ID(s) to full `Author` objects
(`id`, `firstName`, `lastName`).

## Assertions
- Status assertion: `PUT` response status code equals 200.
- Status assertion: `GET` response status code equals 200.
- Business assertion: the updated book returned by `GET` matches `title`, `year`, `price`, and `available`
  from the request.
- Business assertion: the `authors` array on the `GET` result contains entries whose `id`s match the author
  IDs submitted in the `PUT` request, resolved to full `Author` objects.
- Business assertion: the book's `id` (from the path param) is unchanged and matches the `id` returned by
  `GET`.

---

## Test Case ID
POS-BOOKS-PUT-011

## Scenario
Send the same update payload twice in succession (idempotent-style re-submission).

## Purpose
Confirm the endpoint supports repeated identical `PUT` calls without error, consistent with the
conventional idempotency semantics of `PUT`.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded book.

### Query Params
None.

### Request Body
Same payload sent twice, identical:
```json
{ "title": "War and Peace", "authors": [1], "year": 1869, "price": 29.99, "available": 12 }
```

## Expected Status Code
200 OK (for both calls).

## Expected Response
Both calls return a JSON object; the final persisted state after both calls is identical to the state
after the first call.

## Assertions
- Status assertion: both responses return status code 200.
- Business assertion: `GET /books/{id}` after the second call returns the same field values as after the
  first call (idempotency of repeated identical updates).

---

## Test Case ID
POS-BOOKS-PUT-012

## Scenario
Call the endpoint without any authentication header.

## Purpose
Confirm the endpoint is accessible without auth, consistent with the spec declaring no security
requirement.

### Headers
`Content-Type: application/json`. No `Authorization` header sent.

### Path Params
- `id`: id of a pre-existing, seeded book.

### Query Params
None.

### Request Body
```json
{ "title": "No Auth Book", "authors": [1], "year": 2022, "price": 14.99, "available": 8 }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated book, same as the standard happy path.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is a JSON object.
- Business assertion: response is returned successfully with no auth-related error.

# Notes
- The `200` response schema for `updateBook` is documented only as `{ "type": "object" }` (no properties),
  so assertions on returned field values are written to be verified primarily through a follow-up
  `GET /books/{id}` rather than relying solely on the update response shape. See the schema file's Notes for
  the underlying contract gap.
- **Authors association mutability (key finding, POS-BOOKS-PUT-002/003/004):** the spec types
  `UpdateBookPayload.authors` only as `array<integer(int64)>, uniqueItems: true, required` — it does not
  explicitly document replace-vs-merge semantics for the association. These scenarios treat the submitted
  `authors` array as a full replacement of the book's author set (consistent with `PUT`'s conventional
  full-replace semantics and with `authors` being a *required* field here, unlike the fully-optional
  `UpdateAuthorPayload` used by `PUT /authors/{id}`). Actual API behavior must be confirmed via the `GET`
  follow-up in each case; if the API instead merges/appends rather than replaces, this is a contract
  deviation to report.
- Since `authors`, `year`, `price`, and `available` are all required on `UpdateBookPayload`, the
  full-replace-vs-partial-merge ambiguity documented for `PUT /authors/{id}` (`authors-id-put-positive.
  scenario.md`, where every field is optional) applies here only to the single optional `title` field — see
  POS-BOOKS-PUT-005.
- `UpdateBookPayload.price` bounds (`minimum: 1`, `maximum: 10000`) differ from `CreateBookPayload.price`
  (`minimum: 0.01`, `maximum: 1000`). Boundary scenarios in this file (POS-BOOKS-PUT-006/007) intentionally
  use the `PUT`-specific bounds and must not be confused with the `POST /books` boundary values documented
  in `books-post-positive.scenario.md`.
- No uniqueness constraint on `title`/`year`/`price`/`available` is documented, so no scenario asserts a
  conflict on duplicate field values across books.
- No authentication/authorization scheme is declared for this endpoint or globally in the spec, so no
  "valid auth token" variant scenarios are applicable beyond "no auth header" (POS-BOOKS-PUT-012).
- Idempotency: `PUT` is conventionally idempotent (repeated identical calls should produce the same
  end-state). POS-BOOKS-PUT-011 exercises this expectation directly since the spec does not explicitly
  document idempotency guarantees.
- `year` has no documented `minimum`/`maximum`/format constraint on `UpdateBookPayload`, so no boundary
  scenario is defined for it in this file; a realistic historical/current value is used throughout for
  readability. Robustness checks for unusual `year` values are covered as contract-gap findings in the
  negative scenarios file.
- Scenarios that reference author `id`s (e.g. `1`, `2`) assume those IDs correspond to authors already
  seeded via `POST /authors` in the same test run/fixture; automation must not hardcode literal IDs against
  a shared environment and should instead capture the IDs returned by the seeding calls.
- POS-BOOKS-PUT-003 and POS-BOOKS-PUT-004 are written as a sequential pair against the same book `id` to
  exercise both directions of the association change (expand then contract); automation implementing these
  as independent tests should re-seed an equivalent starting state for POS-BOOKS-PUT-004 if run in
  isolation.
