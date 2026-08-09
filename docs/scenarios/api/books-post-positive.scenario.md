# Scenario Title
POST /books — Positive Creation Scenarios

# Endpoint Information
- Method: POST
- Endpoint: /books
- Description: `books-controller` operation `createBook`. Creates a new book from a `CreateBookPayload`
  request body: `title` (optional string), `authors` (required, unique array of existing author `int64`
  IDs), `year` (required `int32`), `price` (required `number`, `0.01`–`1000` inclusive), `available`
  (required `int32`, `1`–`10000` inclusive). Returns `201 Created` on success.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint.
- At least one, and ideally two, existing author records are seeded via `POST /authors` beforehand, since
  `authors` is a required array of author IDs and must reference real authors to build realistic payloads.
- `GET /books`, `GET /books/{id}` are available and used for data-consistency verification steps.
- No uniqueness constraint is documented on `title`/`year`/etc. — duplicate books are assumed to be
  allowed unless observed otherwise (see Notes).

# Test Data
- Valid payload (all fields, single author): `{ "title": "Moby Dick", "authors": [<seeded author id>], "year": 1851, "price": 19.99, "available": 25 }`.
- Valid payload (multiple unique authors): `{ "title": "Good Omens", "authors": [<author id 1>, <author id 2>], "year": 1990, "price": 15.50, "available": 10 }`.
- Valid payload (optional `title` omitted): `{ "authors": [<seeded author id>], "year": 2001, "price": 9.99, "available": 5 }`.
- Boundary payloads:
  - `price` at documented minimum: `0.01`.
  - `price` at documented maximum: `1000`.
  - `available` at documented minimum: `1`.
  - `available` at documented maximum: `10000`.
- Auth variants: none documented — call without any auth header.
- Reusable test values:
  - `CreateBookPayload` request shape: `title` (string, optional), `authors` (int64[], required,
    unique), `year` (int32, required), `price` (number, required, min 0.01/max 1000), `available` (int32,
    required, min 1/max 10000).
  - `Book` shape (for verification via GET): `id`, `title`, `year`, `price`, `coverId`, `available`,
    `authors` (array of `Author` objects).

# Test Cases

## Test Case ID
POS-BOOKS-POST-001

## Scenario
Create a book with a fully populated, valid payload (happy path).

## Purpose
Confirm the endpoint successfully creates a new book when all required fields plus the optional `title`
are provided with valid values.

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
A JSON object representing the created book.

## Assertions
- Status assertion: response status code equals 201.
- Schema assertion: response body is a JSON object.
- Business assertion: the created book is subsequently retrievable via `GET /books` (e.g. filtered by
  `title=Moby Dick`) with matching `title`, `year`, `price`, and `available`.

---

## Test Case ID
POS-BOOKS-POST-002

## Scenario
Create a book referencing multiple, unique existing author IDs.

## Purpose
Confirm the endpoint correctly associates a book with more than one author, exercising the
`uniqueItems: true` array constraint on `authors` with a valid (non-duplicate) set.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Good Omens", "authors": [1, 2], "year": 1990, "price": 15.50, "available": 10 }
```

## Expected Status Code
201 Created

## Expected Response
A JSON object representing the created book.

## Assertions
- Status assertion: response status code equals 201.
- Schema assertion: response body is a JSON object.
- Business assertion: `GET /books/{id}` (or `GET /books?title=Good Omens`) for the created book returns an
  `authors` array containing both referenced authors, each resolved to their full `Author` details (`id`,
  `firstName`, `lastName`) as documented on the `Book` resource.

---

## Test Case ID
POS-BOOKS-POST-003

## Scenario
Create a book without the optional `title` field.

## Purpose
Confirm the endpoint accepts a payload omitting `title`, since it is the only property not declared in
`CreateBookPayload.required`.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "authors": [1], "year": 2001, "price": 9.99, "available": 5 }
```

## Expected Status Code
201 Created

## Expected Response
A JSON object representing the created book, with `title` absent, `null`, or empty (actual behavior
observed, since the spec does not define default handling for an omitted optional field).

## Assertions
- Status assertion: response status code equals 201.
- Schema assertion: response body is a JSON object.
- Business assertion: the book is retrievable via `GET /books/{id}` with `year`, `price`, and `available`
  matching the request, and the observed `title` representation recorded.

---

## Test Case ID
POS-BOOKS-POST-004

## Scenario
Create a book with `price` at the documented minimum boundary (`0.01`).

## Purpose
Confirm the inclusive lower boundary of `CreateBookPayload.price` (`minimum: 0.01`,
`exclusiveMinimum: false`) is accepted.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Penny Paperback", "authors": [1], "year": 2010, "price": 0.01, "available": 5 }
```

## Expected Status Code
201 Created

## Expected Response
A JSON object representing the created book with `price` equal to `0.01`.

## Assertions
- Status assertion: response status code equals 201.
- Business assertion: the persisted `price` (verified via `GET /books/{id}`) equals `0.01`.

---

## Test Case ID
POS-BOOKS-POST-005

## Scenario
Create a book with `price` at the documented maximum boundary (`1000`).

## Purpose
Confirm the inclusive upper boundary of `CreateBookPayload.price` (`maximum: 1000`,
`exclusiveMaximum: false`) is accepted.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Rare First Edition", "authors": [1], "year": 1920, "price": 1000, "available": 1 }
```

## Expected Status Code
201 Created

## Expected Response
A JSON object representing the created book with `price` equal to `1000`.

## Assertions
- Status assertion: response status code equals 201.
- Business assertion: the persisted `price` (verified via `GET /books/{id}`) equals `1000`.

---

## Test Case ID
POS-BOOKS-POST-006

## Scenario
Create a book with `available` at the documented minimum boundary (`1`).

## Purpose
Confirm the inclusive lower boundary of `CreateBookPayload.available` (`minimum: 1`) is accepted.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Last Copy", "authors": [1], "year": 2015, "price": 12.00, "available": 1 }
```

## Expected Status Code
201 Created

## Expected Response
A JSON object representing the created book with `available` equal to `1`.

## Assertions
- Status assertion: response status code equals 201.
- Business assertion: the persisted `available` (verified via `GET /books/{id}`) equals `1`.

---

## Test Case ID
POS-BOOKS-POST-007

## Scenario
Create a book with `available` at the documented maximum boundary (`10000`).

## Purpose
Confirm the inclusive upper boundary of `CreateBookPayload.available` (`maximum: 10000`) is accepted.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "Mass Market Reprint", "authors": [1], "year": 2020, "price": 5.00, "available": 10000 }
```

## Expected Status Code
201 Created

## Expected Response
A JSON object representing the created book with `available` equal to `10000`.

## Assertions
- Status assertion: response status code equals 201.
- Business assertion: the persisted `available` (verified via `GET /books/{id}`) equals `10000`.

---

## Test Case ID
POS-BOOKS-POST-008

## Scenario
Data consistency check — a book created via `POST /books` is retrievable via `GET /books` with a matching
`title` filter, and its `authors` field resolves to full author details.

## Purpose
Confirm data persistence between the create and list operations for this resource, and confirm how the
request-side `authors: number[]` (IDs) is represented on the read side as `authors: Author[]` (objects) per
the `Book` schema.

### Headers
`Content-Type: application/json` (for the create call).

### Path Params
None.

### Query Params
`title` set to the newly created book's title (for the verification `GET /books` call).

### Request Body
```json
{ "title": "Data Consistency Test Book", "authors": [1], "year": 1999, "price": 29.99, "available": 3 }
```

## Expected Status Code
201 Created (for the `POST`); 200 OK (for the verification `GET`).

## Expected Response
`POST` returns a JSON object; `GET /books?title=Data Consistency Test Book` returns an array containing a
book with matching `title`, `year`, `price`, `available`, and an `authors` array resolving the submitted
author ID(s) to full `Author` objects (`id`, `firstName`, `lastName`).

## Assertions
- Status assertion: `POST` response status code equals 201.
- Status assertion: `GET` response status code equals 200.
- Business assertion: the newly created book appears in the `GET` results with matching `title`, `year`,
  `price`, and `available`.
- Business assertion: the `authors` array on the `GET` result contains an entry whose `id` matches the
  author ID submitted at creation time.
- Business assertion (if `id` is returned by `POST`): the same `id` is present on the matching item in the
  `GET` results.

---

## Test Case ID
POS-BOOKS-POST-009

## Scenario
Call the endpoint without any authentication header.

## Purpose
Confirm the endpoint is accessible without auth, consistent with the spec declaring no security
requirement.

### Headers
`Content-Type: application/json`. No `Authorization` header sent.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "title": "No Auth Book", "authors": [1], "year": 2022, "price": 14.99, "available": 8 }
```

## Expected Status Code
201 Created

## Expected Response
A JSON object representing the created book, same as the standard happy path.

## Assertions
- Status assertion: response status code equals 201.
- Schema assertion: response body is a JSON object.
- Business assertion: response is returned successfully with no auth-related error.

# Notes
- The `201` response schema for `createBook` is documented only as `{ "type": "object" }` (no
  properties), so assertions on returned field values (e.g. `id`, echoed `title`/`year`/`price`/
  `available`, or the shape of `authors`) are written to be verified via the response body when present,
  with persistence and the `authors` ID-to-object resolution cross-checked through `GET /books` /
  `GET /books/{id}` rather than relying solely on the create response shape. See the schema file's Notes
  for the underlying contract gap.
- No uniqueness constraint on `title`/`year`/`price`/`available` is documented, so duplicate books
  (identical field values) are assumed to be allowed by design; if the running API rejects duplicates,
  this is a deviation from the documented contract and should be reported.
- No authentication/authorization scheme is declared for this endpoint or globally in the spec, so no
  "valid auth token" variant scenarios are applicable beyond "no auth header" (POS-BOOKS-POST-009).
- Idempotency is not applicable — `POST` for resource creation is inherently non-idempotent (each call
  creates a new resource with a new `id`).
- `year` has no documented `minimum`/`maximum`/format constraint on `CreateBookPayload`, so no boundary
  scenario is defined for it in this file; a realistic historical/current value is used throughout for
  readability. Robustness checks for unusual `year` values are covered as contract-gap findings in the
  negative scenarios file.
- Scenarios that reference author `id`s (e.g. `1`, `2`) assume those IDs correspond to authors already
  seeded via `POST /authors` in the same test run/fixture; automation must not hardcode literal IDs against
  a shared environment and should instead capture the IDs returned by the seeding calls.
