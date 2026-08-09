# Scenario Title
DELETE /books/{id} — Positive Deletion Scenarios

# Endpoint Information
- Method: DELETE
- Endpoint: /books/{id}
- Description: `books-controller` operation `deleteById`. Deletes an existing book identified by the path
  parameter `id` (integer, `int64`, required). Returns `204 No Content` on success with no response body.
  This file validates successful deletion, its side effects (removal from subsequent reads/listings), and
  data-consistency behavior across related endpoints (`GET /books/{id}`, `GET /books`) and related
  resources (`Author`, via `Book.authors`).

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint.
- `POST /authors` is available to seed author records referenced by seeded books.
- `POST /books` is available to seed book records for deletion (requires `authors`, `year`, `price`,
  `available`, per `CreateBookPayload`).
- `GET /books/{id}` and `GET /books` (collection, supporting `title`/`author` query filters) are available
  and used for verification steps after each deletion.
- `GET /authors/{id}` is available to verify that referenced authors are unaffected by a book deletion.
- Because deletion is destructive, each test case in this file operates on its own freshly seeded book
  record so tests remain independent and repeatable.

# Test Data
- Valid path param: `id` of a freshly seeded book, created via `POST /books` with a known payload (e.g.
  `{ "title": "The Old Man and the Sea", "authors": [<seeded author id>], "year": 1952, "price": 12.50,
  "available": 10 }`).
- No request body applicable — the operation has no `requestBody`.
- Auth variants: none documented — call without any auth header.
- Reusable test values:
  - `RestBook` shape (for verification via `GET /books` collection): `id` (int64), `title` (string), `year`
    (int32), `price` (number), `coverUrl` (string), `available` (int32), `authors` (array of `RestAuthor`).
  - `Book` shape (for verification via `GET /books/{id}`): `id`, `title`, `year`, `price`, `coverId`,
    `available`, `authors` (array of full `Author` objects).
  - `id` path param: integer, `int64`, of a pre-existing seeded book.

# Test Cases

## Test Case ID
POS-BOOKS-DELETE-001

## Scenario
Delete an existing book that is not referenced by any order (happy path).

## Purpose
Confirm the endpoint successfully deletes an existing, unreferenced book for a valid `id`.

### Headers
None required.

### Path Params
- `id`: id of a freshly seeded book with no order associations.

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content

## Expected Response
No response body.

## Assertions
- Status assertion: response status code equals 204.
- Schema assertion: response body is empty.
- Business assertion: the book no longer appears in `GET /books` filtered by its known `title` (collection
  no longer contains the deleted record).

---

## Test Case ID
POS-BOOKS-DELETE-002

## Scenario
Verify the state of a deleted book via a follow-up `GET /books/{id}` for the same `id`.

## Purpose
Confirm data-consistency behavior after deletion and record the actual response returned for a
now-nonexistent resource, since `GET /books/{id}` (`getById`) documents only a `200` response with no `404`
declared for this operation either.

### Headers
None required for the `DELETE`.

### Path Params
- `id`: id of a freshly seeded book.

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content (for the `DELETE`).

## Expected Response
`DELETE` returns no body. The subsequent `GET /books/{id}` response status/body is recorded — a `404`
would be the conventionally expected outcome, but this is not guaranteed by the spec (see Notes).

## Assertions
- Status assertion: `DELETE` response status code equals 204.
- Business assertion: the subsequent `GET /books/{id}` call for the same, now-deleted `id` is executed and
  its actual status code/body is recorded (not asserted as a specific documented value, since no error
  response is declared for `getById`).

---

## Test Case ID
POS-BOOKS-DELETE-003

## Scenario
Delete one book among several existing books and confirm the others remain unaffected (data isolation).

## Purpose
Confirm the deletion is scoped only to the targeted `id` and does not impact other, unrelated book
records.

### Headers
None required.

### Path Params
- `id`: id of one freshly seeded book, among at least two seeded books.

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content

## Expected Response
No response body.

## Assertions
- Status assertion: response status code equals 204.
- Business assertion: a sibling book (seeded alongside the deleted one but not targeted) remains
  retrievable via `GET /books/{id}` with its original `title`/`year`/`price`/`available` unchanged.

---

## Test Case ID
POS-BOOKS-DELETE-004

## Scenario
Confirm the book collection count decreases by exactly one after a successful deletion.

## Purpose
Validate data consistency between the delete operation and the collection-level `GET /books` endpoint.

### Headers
None required.

### Path Params
- `id`: id of a freshly seeded book.

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content

## Expected Response
No response body for the `DELETE`; `GET /books` subsequently returns one fewer entry than before the
deletion.

## Assertions
- Status assertion: response status code equals 204.
- Business assertion: the total count of books returned by `GET /books` after the deletion is exactly one
  less than the count captured immediately before the deletion.
- Business assertion: the deleted book's `id` is not present in the `GET /books` response array.

---

## Test Case ID
POS-BOOKS-DELETE-005

## Scenario
Delete a book that references one or more existing authors, and confirm those authors remain unaffected.

## Purpose
Confirm the one-directional nature of the `Book → Author` relationship: `Book.authors` references `Author`
records, but `Author` does not reference `Book` back in the schema, so deleting a book is not expected to
require or trigger any change to the author records it lists. This directly verifies (rather than assumes)
the expected behavior called out for this endpoint, mirroring — from the opposite direction — the
referential-integrity question already raised for `DELETE /authors/{id}` (`authors-id-delete-negative.scenario.md`,
NEG-AUTHORS-DELETE-007).

### Headers
None required.

### Path Params
- `id`: id of a freshly seeded book whose `authors` array references at least one existing, independently
  verifiable author.

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content

## Expected Response
No response body for the `DELETE`. The referenced author remains retrievable and unchanged.

## Assertions
- Status assertion: response status code equals 204.
- Schema assertion: response body is empty.
- Business assertion: `GET /authors/{id}` for each author previously referenced by the deleted book still
  returns the same author record (`firstName`/`lastName` unchanged), confirming the author was not deleted,
  modified, or otherwise affected by the book's deletion.

---

## Test Case ID
POS-BOOKS-DELETE-006

## Scenario
Call the endpoint without any authentication header.

## Purpose
Confirm the endpoint is accessible without auth, consistent with the spec declaring no security
requirement.

### Headers
No `Authorization` header sent.

### Path Params
- `id`: id of a freshly seeded book.

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content

## Expected Response
No response body, same as the standard happy path.

## Assertions
- Status assertion: response status code equals 204.
- Schema assertion: response body is empty.
- Business assertion: response is returned successfully with no auth-related error.

# Notes
- `GET /books/{id}` (`getById`) documents only a `200` response for this spec — no `404` is declared for a
  non-existent `id`. POS-BOOKS-DELETE-002 therefore records the actual observed behavior after deletion
  rather than asserting a specific documented status code; this mirrors the same contract gap already
  recorded for `GET /authors/{id}` in `authors-id-delete-positive.scenario.md` (POS-AUTHORS-DELETE-002).
- POS-BOOKS-DELETE-005 confirms the expected, simpler direction of the `Book`/`Author` relationship for
  this endpoint: since `Book.authors` is the only documented link between the two schemas and `Author` has
  no field referencing `Book`, deleting a book has no documented (or logically necessary) reason to touch
  author records. This is the inverse counterpart to the undocumented, higher-risk question already raised
  for `DELETE /authors/{id}` (deleting an author still referenced by a book) — that question remains a
  genuine referential-integrity gap and is not resolved by this test.
- A separate, undocumented referential-integrity question exists for deleting a book that **is** referenced
  by something else — specifically an existing order (`RichOrder.items[].book` references `Book`). Unlike
  the `Author` relationship, this is a real, undocumented risk (order history could be broken or an order
  item could be left dangling) and is therefore treated as a negative/business-validation case in the
  negative scenarios file rather than assumed to succeed here.
- No documented business rule addresses whether deleting a book also deletes or orphans its associated
  cover upload (`Book.coverId`, managed via `PATCH /books/{id}/cover` / `DELETE /books/{id}/cover`). This
  is also deferred to the negative scenarios file as an undocumented-behavior observation.
- No authentication/authorization scheme is declared for this endpoint or globally in the spec, so no
  "valid auth token" variant scenarios are applicable beyond "no auth header" (POS-BOOKS-DELETE-006).
- `DELETE` has no request body in this spec, so no positive scenarios involving payload variations apply
  (unlike the `PUT`/`PATCH` counterparts for `/books/{id}`).
