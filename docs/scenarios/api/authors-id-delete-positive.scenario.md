# Scenario Title
DELETE /authors/{id} — Positive Deletion Scenarios

# Endpoint Information
- Method: DELETE
- Endpoint: /authors/{id}
- Description: `authors-controller` operation `deleteById_1`. Deletes an existing author identified by the
  path parameter `id` (integer, `int64`, required). Returns `204 No Content` on success with no response
  body. This file validates successful deletion, its side effects (removal from subsequent reads/listings),
  and data-consistency behavior across related endpoints (`GET /authors/{id}`, `GET /authors`).

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint.
- `POST /authors` is available to seed author records for deletion.
- `GET /authors/{id}` and `GET /authors` (collection, supporting `firstName`/`lastName` query filters) are
  available and used for verification steps after each deletion.
- Because deletion is destructive, each test case in this file operates on its own freshly seeded author
  record so tests remain independent and repeatable.

# Test Data
- Valid path param: `id` of a freshly seeded author, created via `POST /authors` with a known
  `firstName`/`lastName` (e.g. `{ "firstName": "Gustave", "lastName": "Flaubert" }`).
- No request body applicable — the operation has no `requestBody`.
- Auth variants: none documented — call without any auth header.
- Reusable test values:
  - `Author` shape (for verification via `GET`): `id` (int64), `firstName` (string), `lastName` (string).
  - `id` path param: integer, `int64`, of a pre-existing seeded author.

# Test Cases

## Test Case ID
POS-AUTHORS-DELETE-001

## Scenario
Delete an existing author that has no associated books (happy path).

## Purpose
Confirm the endpoint successfully deletes an existing, unreferenced author for a valid `id`.

### Headers
None required.

### Path Params
- `id`: id of a freshly seeded author with no book associations.

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
- Business assertion: the author no longer appears in `GET /authors` filtered by its known
  `firstName`/`lastName` (collection no longer contains the deleted record).

---

## Test Case ID
POS-AUTHORS-DELETE-002

## Scenario
Verify the state of a deleted author via a follow-up `GET /authors/{id}` for the same `id`.

## Purpose
Confirm data-consistency behavior after deletion and record the actual response returned for a
now-nonexistent resource, since `GET /authors/{id}` (`getById_1`) documents only a `200` response with no
`404` declared for this operation either.

### Headers
None required for the `DELETE`.

### Path Params
- `id`: id of a freshly seeded author.

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content (for the `DELETE`).

## Expected Response
`DELETE` returns no body. The subsequent `GET /authors/{id}` response status/body is recorded — a `404`
would be the conventionally expected outcome, but this is not guaranteed by the spec (see Notes).

## Assertions
- Status assertion: `DELETE` response status code equals 204.
- Business assertion: the subsequent `GET /authors/{id}` call for the same, now-deleted `id` is executed
  and its actual status code/body is recorded (not asserted as a specific documented value, since no error
  response is declared for `getById_1`).

---

## Test Case ID
POS-AUTHORS-DELETE-003

## Scenario
Delete one author among several existing authors and confirm the others remain unaffected (data
isolation).

## Purpose
Confirm the deletion is scoped only to the targeted `id` and does not impact other, unrelated author
records.

### Headers
None required.

### Path Params
- `id`: id of one freshly seeded author, among at least two seeded authors.

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
- Business assertion: a sibling author (seeded alongside the deleted one but not targeted) remains
  retrievable via `GET /authors/{id}` with its original `firstName`/`lastName` unchanged.

---

## Test Case ID
POS-AUTHORS-DELETE-004

## Scenario
Confirm the author collection count decreases by exactly one after a successful deletion.

## Purpose
Validate data consistency between the delete operation and the collection-level `GET /authors` endpoint.

### Headers
None required.

### Path Params
- `id`: id of a freshly seeded author.

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content

## Expected Response
No response body for the `DELETE`; `GET /authors` subsequently returns one fewer entry than before the
deletion.

## Assertions
- Status assertion: response status code equals 204.
- Business assertion: the total count of authors returned by `GET /authors` after the deletion is exactly
  one less than the count captured immediately before the deletion.
- Business assertion: the deleted author's `id` is not present in the `GET /authors` response array.

---

## Test Case ID
POS-AUTHORS-DELETE-005

## Scenario
Call the endpoint without any authentication header.

## Purpose
Confirm the endpoint is accessible without auth, consistent with the spec declaring no security
requirement.

### Headers
No `Authorization` header sent.

### Path Params
- `id`: id of a freshly seeded author.

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
- `GET /authors/{id}` (`getById_1`) documents only a `200` response for this spec — no `404` is declared
  for a non-existent `id`. POS-AUTHORS-DELETE-002 therefore records the actual observed behavior after
  deletion rather than asserting a specific documented status code; this observation should also inform
  the `GET /authors/{id}` scenario files if/when they are authored, since the same contract gap applies
  there.
- No documented business rule restricts deletion based on whether an author is referenced by an existing
  book (`Book.authors` is an array of `Author`). Since this could plausibly fail, cascade, or orphan
  references, and the spec does not document the expected behavior, that scenario is treated as a
  negative/business-validation case (documented-absence gap) in the negative scenarios file rather than
  assumed to succeed here.
- No authentication/authorization scheme is declared for this endpoint or globally in the spec, so no
  "valid auth token" variant scenarios are applicable beyond "no auth header" (POS-AUTHORS-DELETE-005).
- `DELETE` has no request body in this spec, so no positive scenarios involving payload variations apply
  (unlike the `PUT`/`PATCH` counterparts for `/authors/{id}`).
