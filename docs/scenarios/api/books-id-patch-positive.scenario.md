# Scenario Title
PATCH /books/{id} — Positive Partial Update Scenarios

# Endpoint Information
- Method: PATCH
- Endpoint: /books/{id}
- Description: `books-controller` operation `partialUpdateBook`. Partially updates an existing book
  identified by path parameter `id`. The request body accepts an arbitrary JSON object (no formally named
  properties documented), realistically used to update one or more of `title`, `year`, `price`,
  `available`, `authors` (per the sibling `Book` and `UpdateBookPayload` schemas — see Notes).

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint.
- A seeded book exists (or is created via `POST /books` as setup) with a known `id`, `title`, `year`,
  `price`, `available`, and `authors`, so update scenarios have a deterministic starting state and can be
  verified afterward via `GET /books/{id}`.
- At least two, ideally three, existing author records are seeded via `POST /authors` beforehand, so the
  `authors`-reassignment scenario can reference multiple distinct, real author IDs.
- `GET /books/{id}` is available and used for data-consistency verification after each update, since the
  PATCH response body itself is not contractually guaranteed to reflect the updated state (see the schema
  file).

# Test Data
- Valid payloads (single field):
  - `{ "title": "PatchedTitle" }`
  - `{ "year": 1999 }`
  - `{ "price": 15.50 }` — a mid-range value within `UpdateBookPayload`'s documented `price` bounds
    (`min: 1`, `max: 10000`), used here as a realistic (non-formally-contractual) reference.
  - `{ "available": 10 }` — a mid-range value within `UpdateBookPayload`'s documented `available` bounds
    (`min: 1`, `max: 10000`).
  - `{ "authors": [<seeded author id B>] }` — reassign to a different existing author.
- Valid payloads (multi-field):
  - `{ "title": "MultiPatchedTitle", "price": 22.00, "available": 30, "authors": [<seeded author id A>, <seeded author id B>] }`
- Boundary payloads (borrowed from `UpdateBookPayload`'s documented bounds as a realistic baseline):
  - `price` at minimum: `{ "price": 1 }`.
  - `price` at maximum: `{ "price": 10000 }`.
  - `available` at minimum: `{ "available": 1 }`.
  - `available` at maximum: `{ "available": 10000 }`.
- Empty payload: `{}` (no-op partial update; contract-valid since no field is `required`).
- Path params:
  - `id`: a valid, existing book `id` (`integer`, `format: int64`).
- Auth variants: none documented — call without any auth header.
- Reusable test values:
  - Seeded book for update scenarios: create via `POST /books` with a known `title`/`year`/`price`/
    `available`/`authors` prior to each test, or reuse a shared seeded book where test isolation allows.
  - At least two seeded author `id`s (author id A, author id B) for the `authors`-reassignment scenario.

# Test Cases

## Test Case ID
POS-BOOKS-PATCH-001

## Scenario
Partially update only the `title` of an existing book (happy path).

## Purpose
Confirm a single-field partial update succeeds and the field is persisted, while all other fields
(`year`, `price`, `available`, `authors`) remain unchanged.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded book with known field values.

### Query Params
None.

### Request Body
`{ "title": "PatchedTitle" }`

## Expected Status Code
200 OK

## Expected Response
A JSON object reflecting the update (actual response body shape is undocumented — see schema file Notes).

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: a follow-up `GET /books/{id}` shows `title` equal to `"PatchedTitle"`.
- Business assertion: the follow-up `GET /books/{id}` shows `year`, `price`, `available`, and `authors`
  unchanged from their original seeded values (confirms partial, not full, replacement).

---

## Test Case ID
POS-BOOKS-PATCH-002

## Scenario
Partially update only the `year` of an existing book.

## Purpose
Confirm updating a single numeric field succeeds and all other fields remain unchanged.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded book.

### Query Params
None.

### Request Body
`{ "year": 1999 }`

## Expected Status Code
200 OK

## Expected Response
A JSON object reflecting the update.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: a follow-up `GET /books/{id}` shows `year` equal to `1999`.
- Business assertion: the follow-up `GET /books/{id}` shows `title`, `price`, `available`, and `authors`
  unchanged from their original seeded values.

---

## Test Case ID
POS-BOOKS-PATCH-003

## Scenario
Partially update only the `price` of an existing book with a mid-range valid value.

## Purpose
Confirm updating `price` in isolation succeeds and persists correctly.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded book.

### Query Params
None.

### Request Body
`{ "price": 15.50 }`

## Expected Status Code
200 OK

## Expected Response
A JSON object reflecting the update.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: a follow-up `GET /books/{id}` shows `price` equal to `15.50`.
- Business assertion: the follow-up `GET /books/{id}` shows all other fields unchanged.

---

## Test Case ID
POS-BOOKS-PATCH-004

## Scenario
Partially update only the `available` (stock) count of an existing book with a mid-range valid value.

## Purpose
Confirm updating `available` in isolation succeeds and persists correctly.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded book.

### Query Params
None.

### Request Body
`{ "available": 10 }`

## Expected Status Code
200 OK

## Expected Response
A JSON object reflecting the update.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: a follow-up `GET /books/{id}` shows `available` equal to `10`.
- Business assertion: the follow-up `GET /books/{id}` shows all other fields unchanged.

---

## Test Case ID
POS-BOOKS-PATCH-005

## Scenario
Partially update only the `authors` association, reassigning the book to a different existing author.

## Purpose
Confirm the `authors` field can be updated independently via PATCH, and that the association is correctly
persisted and observable via `GET /books/{id}` — including which representation (`Author` objects vs. raw
IDs) is used, per the open finding in the schema file.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded book originally associated with author id A.

### Query Params
None.

### Request Body
`{ "authors": [<seeded author id B>] }`

## Expected Status Code
200 OK

## Expected Response
A JSON object reflecting the update.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: a follow-up `GET /books/{id}` shows `authors` containing exactly author id B (as an
  `Author` object per the `Book` schema), and no longer containing author id A — confirming the `authors`
  array is fully replaced by the patch value, not merged/appended.
- Business assertion: all other fields (`title`, `year`, `price`, `available`) remain unchanged.

---

## Test Case ID
POS-BOOKS-PATCH-006

## Scenario
Update multiple fields (`title`, `price`, `available`, `authors`) in a single request.

## Purpose
Confirm a multi-field partial update applies all changes atomically, while `year` (the one field omitted
from this payload) remains unchanged.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded book.

### Query Params
None.

### Request Body
`{ "title": "MultiPatchedTitle", "price": 22.00, "available": 30, "authors": [<seeded author id A>, <seeded author id B>] }`

## Expected Status Code
200 OK

## Expected Response
A JSON object reflecting all submitted updates.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: a follow-up `GET /books/{id}` shows `title`, `price`, `available`, and `authors`
  (both author ids A and B) matching the submitted values.
- Business assertion: `year` remains unchanged from its pre-request value (confirms the field omitted from
  this payload was not affected).

---

## Test Case ID
POS-BOOKS-PATCH-007

## Scenario
Send an empty request body (no fields to update).

## Purpose
Confirm a no-op partial update (empty object) is accepted and leaves the resource unchanged, since no
field is documented as `required`.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded book with known field values.

### Query Params
None.

### Request Body
`{}`

## Expected Status Code
200 OK

## Expected Response
A JSON object; resource state is unchanged.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: a follow-up `GET /books/{id}` shows all fields (`title`, `year`, `price`,
  `available`, `authors`) unchanged from their pre-request values.

---

## Test Case ID
POS-BOOKS-PATCH-008

## Scenario
Update a book using the same value it already has (idempotent-style update).

## Purpose
Confirm repeating the same partial update produces a consistent, stable result (idempotency check for a
semantically idempotent operation).

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded book.

### Query Params
None.

### Request Body
`{ "title": "IdempotentTitle" }` (sent twice in sequence).

## Expected Status Code
200 OK (both calls).

## Expected Response
Both calls return a JSON object with the same effective state.

## Assertions
- Status assertion: both requests return status code 200.
- Business assertion: a follow-up `GET /books/{id}` after either call shows the same `title` value
  (`"IdempotentTitle"`), confirming repeated identical PATCH calls converge to the same state.

---

## Test Case ID
POS-BOOKS-PATCH-009

## Scenario
Patch `price` to its documented boundary values (`min: 1` and `max: 10000`, per `UpdateBookPayload`) in
sequence.

## Purpose
Confirm the API accepts `price` at both documented boundary edges when patched in isolation, exercising
the same numeric bounds documented for the sibling `PUT` operation as a realistic baseline for this field.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded book.

### Query Params
None.

### Request Body
`{ "price": 1 }`, followed by `{ "price": 10000 }`.

## Expected Status Code
200 OK (both calls).

## Expected Response
Both calls return a JSON object reflecting the respective boundary value.

## Assertions
- Status assertion: both requests return status code 200.
- Business assertion: a follow-up `GET /books/{id}` after the first call shows `price` equal to `1`.
- Business assertion: a follow-up `GET /books/{id}` after the second call shows `price` equal to `10000`.

---

## Test Case ID
POS-BOOKS-PATCH-010

## Scenario
Patch `available` to its documented boundary values (`min: 1` and `max: 10000`, per `UpdateBookPayload`)
in sequence.

## Purpose
Confirm the API accepts `available` at both documented boundary edges when patched in isolation.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded book.

### Query Params
None.

### Request Body
`{ "available": 1 }`, followed by `{ "available": 10000 }`.

## Expected Status Code
200 OK (both calls).

## Expected Response
Both calls return a JSON object reflecting the respective boundary value.

## Assertions
- Status assertion: both requests return status code 200.
- Business assertion: a follow-up `GET /books/{id}` after the first call shows `available` equal to `1`.
- Business assertion: a follow-up `GET /books/{id}` after the second call shows `available` equal to
  `10000`.

---

## Test Case ID
POS-BOOKS-PATCH-011

## Scenario
Call the endpoint without any authentication header.

## Purpose
Confirm the endpoint is accessible without auth, consistent with the spec declaring no security
requirement.

### Headers
`Content-Type: application/json` (no `Authorization` header sent).

### Path Params
- `id`: id of a seeded book.

### Query Params
None.

### Request Body
`{ "title": "NoAuthPatch" }`

## Expected Status Code
200 OK

## Expected Response
A JSON object reflecting the update, with no auth-related error.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: the update is applied successfully with no auth-related error.

---

## Test Case ID
POS-BOOKS-PATCH-012

## Scenario
Data consistency check — a book updated via PATCH is reflected via `GET /books` (collection), including
its updated `title` and its reassigned `authors` association.

## Purpose
Confirm data persistence and consistency between the partial-update operation and the list/filter
operation for this resource, across both a scalar field (`title`) and the relational field (`authors`).

### Headers
`Content-Type: application/json` (for the PATCH call).

### Path Params
- `id`: id of a seeded book.

### Query Params
- `title`: the updated book's new title (used on a follow-up `GET /books` call to verify).
- `author`: the reassigned author's name (used on a second follow-up `GET /books` call to verify).

### Request Body
`{ "title": "ConsistencyCheckTitle", "authors": [<seeded author id B>] }`

## Expected Status Code
200 OK

## Expected Response
The subsequent `GET /books?title=ConsistencyCheckTitle` call returns the updated book, and
`GET /books?author=<author B name>` also includes it.

## Assertions
- Status assertion: PATCH response status code equals 200.
- Business assertion: the updated book appears in `GET /books?title=ConsistencyCheckTitle` results with
  the new `title` value and the same `id`.
- Business assertion: the updated book appears in `GET /books?author=<author B name>` results, confirming
  the reassigned `authors` association is reflected in the filtered collection view.

# Notes
- The request body schema for this operation is documented generically (`type: object,
  additionalProperties: { type: object }`), not as a named schema with `title`/`year`/`price`/`available`/
  `authors` properties. All test cases assume these five fields are the patchable fields, based on the
  sibling `Book` and `UpdateBookPayload` schemas for this resource — this is an explicit assumption, not a
  documented guarantee, and should be confirmed against the running API.
- The response body schema is a bare `type: object` with no defined shape. Assertions in this file
  therefore verify state changes via a follow-up `GET /books/{id}` (or `GET /books` with filtering) rather
  than asserting specific fields directly on the PATCH response body, since the PATCH response shape is not
  contractually guaranteed — consistent with the approach taken in `books-id-put-positive.scenario.md` and
  `authors-id-patch-positive.scenario.md`.
- **`authors` replace-vs-merge semantics (key finding, POS-BOOKS-PATCH-005):** the spec does not document
  whether patching `authors` fully replaces the existing association array or merges/appends to it. This
  test file's assertions treat a full replace as the expected outcome (consistent with the array's
  `uniqueItems: true` constraint on the sibling `UpdateBookPayload`/`CreateBookPayload` schemas, and with
  how `PUT /books/{id}` is documented to behave), but this must be confirmed against the running API and is
  flagged as a contract-gap finding if the actual behavior differs (e.g. if it merges instead).
- `price`/`available` boundary values (`min: 1`/`max: 10000`) used in POS-BOOKS-PATCH-009/010 are borrowed
  from the sibling `UpdateBookPayload` schema (used by `PUT /books/{id}`) as a realistic reference, since
  the PATCH request schema itself declares no numeric constraints. If the live API enforces different (or
  no) bounds on PATCH, this is a contract-gap finding, not a test defect.
- No pagination, sorting, or additional business rules (e.g. price/stock validation beyond the borrowed
  bounds) are documented specifically for this PATCH operation, so no such scenarios beyond the
  boundary/consistency cases above are included.
- No authentication/authorization scheme is declared for this endpoint or globally in the spec, so no
  "valid auth" variant scenarios beyond "no auth header" are applicable.
- `coverId` is intentionally excluded from the patchable-field assumption set in this file, since the spec
  documents a dedicated `PATCH /books/{id}/cover` operation for managing the book cover; attempting to set
  `coverId` via this generic PATCH is exercised as a negative/robustness case instead (see the negative
  scenarios file).
