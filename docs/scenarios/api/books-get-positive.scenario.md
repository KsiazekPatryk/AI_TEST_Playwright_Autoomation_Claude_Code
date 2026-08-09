# Scenario Title
GET /books — Positive Retrieval and Filtering Scenarios

# Endpoint Information
- Method: GET
- Endpoint: /books
- Description: `books-controller` operation `getAll`. Returns a list of `RestBook` objects, optionally
  filtered by the query parameters `title` and `author` (both optional strings, no format/length
  constraints documented).

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint.
- At least one known book exists in the system with a known `title` and at least one known author name, so
  filter scenarios have a deterministic expected match. Recommend seeding via `POST /books` (with an
  author seeded via `POST /authors`) before running filter-based test cases, since the spec does not
  guarantee any pre-existing data.

# Test Data
- Valid payload: N/A — GET request, no request body.
- Query params (both optional, `type: string`, no format/enum/length constraints documented):
  - `title`: e.g. an existing book's title (exact value depends on seeded data).
  - `author`: e.g. an existing book's author's first or last name (exact value depends on seeded data).
- Auth variants: none documented — call without any auth header.
- Boundary values: N/A (no min/max length or numeric constraints documented for query params).
- Reusable test values:
  - `RestBook` response shape: `id` (int64), `title` (string), `year` (int32), `price` (number), `coverUrl`
    (string), `available` (int32), `authors` (array of `RestAuthor`: `firstName`, `lastName` — no `id`; see
    `books-get-schema.scenario.md` for the full contract finding).
  - Confirmed live filtering behavior against the deployed API:
    - `title` performs a **case-insensitive substring match** against a book's title (e.g. `?title=clean`
      matched "Clean Code", "Clean Architecture", "The Clean Coder").
    - `author` performs a **case-insensitive substring match** against a book's author name(s), matching
      against **either `firstName` or `lastName`** of any author on the book (e.g. `?author=martin` matched
      books by "Robert C.Martin", "Martin Fowler", and "Martin Kleppmann" — i.e. it matched both first-name
      and last-name occurrences of "Martin" across different books/authors).

# Test Cases

## Test Case ID
POS-BOOKS-GET-001

## Scenario
Retrieve all books with no filters applied (happy path).

## Purpose
Confirm the base endpoint returns the full book collection successfully.

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
JSON array of `RestBook` objects representing all books currently in the system.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: array length is greater than or equal to the number of books known to be seeded for
  the test.
- Field assertion: at least one returned item contains a valid `id`, `title`, `year`, `price`, `coverUrl`,
  `available`, and a non-empty `authors` array.

---

## Test Case ID
POS-BOOKS-GET-002

## Scenario
Filter books by `title` with a value that is a case-insensitive substring of an existing book's title.

## Purpose
Confirm the `title` query parameter filters the collection to matching results, using the confirmed
case-insensitive substring matching behavior.

### Headers
None required.

### Path Params
None.

### Query Params
- `title`: a lower-cased substring of a known, seeded book's title (e.g. a fragment of the title, not
  necessarily the full string).

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
JSON array containing only book(s) whose `title` contains the query substring, case-insensitively.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: every returned item's `title` contains the filter substring, case-insensitively.
- Business assertion: the seeded book used to build the filter value is present in the results.

---

## Test Case ID
POS-BOOKS-GET-003

## Scenario
Filter books by `author` with a value matching an existing author's first name.

## Purpose
Confirm the `author` query parameter filters the collection by matching against an author's `firstName`.

### Headers
None required.

### Path Params
None.

### Query Params
- `author`: value of a known, seeded book's author's first name (or a case-insensitive substring of it).

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
JSON array containing only book(s) with at least one author whose `firstName` contains the query value,
case-insensitively.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: every returned item has at least one entry in `authors` whose `firstName` contains
  the filter value, case-insensitively.
- Business assertion: the seeded book used to build the filter value is present in the results.

---

## Test Case ID
POS-BOOKS-GET-004

## Scenario
Filter books by `author` with a value matching an existing author's last name.

## Purpose
Confirm the `author` query parameter also matches against an author's `lastName`, not just `firstName`.

### Headers
None required.

### Path Params
None.

### Query Params
- `author`: value of a known, seeded book's author's last name (or a case-insensitive substring of it).

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
JSON array containing only book(s) with at least one author whose `lastName` contains the query value,
case-insensitively.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: every returned item has at least one entry in `authors` whose `lastName` contains the
  filter value, case-insensitively.
- Business assertion: the seeded book used to build the filter value is present in the results.

---

## Test Case ID
POS-BOOKS-GET-005

## Scenario
Filter books by both `title` and `author` simultaneously.

## Purpose
Confirm combined filtering returns the intersection of both criteria.

### Headers
None required.

### Path Params
None.

### Query Params
- `title`: a substring of a known, seeded book's title.
- `author`: a substring of that same book's author's name.

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
JSON array containing only the book(s) matching both `title` and `author` criteria.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: every returned item satisfies both filter criteria simultaneously.
- Business assertion: the target seeded book is present in the results exactly once.

---

## Test Case ID
POS-BOOKS-GET-006

## Scenario
Filter with a value that matches no existing book.

## Purpose
Confirm a non-matching filter returns a successful empty result rather than an error.

### Headers
None required.

### Path Params
None.

### Query Params
- `title`: a value guaranteed not to match any seeded book (e.g. a random unique string; confirmed live
  with `title=zzzznonexistentbookzzzz` returning `[]`).

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
`[]` — an empty JSON array.

## Assertions
- Status assertion: response status code equals 200 (not 404).
- Schema assertion: response body is an array.
- Business assertion: array length equals 0.

---

## Test Case ID
POS-BOOKS-GET-007

## Scenario
Call the endpoint without any authentication header.

## Purpose
Confirm the endpoint is accessible without auth, consistent with the spec declaring no security
requirement.

### Headers
No `Authorization` header sent.

### Path Params
None.

### Query Params
None.

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
JSON array of `RestBook` objects, same as the unfiltered happy path.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: response is returned successfully with no auth-related error.

---

## Test Case ID
POS-BOOKS-GET-008

## Scenario
Data consistency check — a book created via `POST /books` is retrievable via `GET /books` with a matching
`title` filter, and its `authors` field is represented per the `RestBook`/`RestAuthor` contract (no `id`).

## Purpose
Confirm data persistence between the create and list operations for this resource, and confirm — as a
business-level consequence of the schema finding in `books-get-schema.scenario.md` — that the collection
endpoint's representation of a newly created book's authors omits `id` even though the create request
itself referenced authors by `id`.

### Headers
`Content-Type: application/json` (for the setup `POST /books` call).

### Path Params
None.

### Query Params
- `title`: the newly created book's title (for the verification `GET /books` call).

### Request Body
Setup step: `POST /books` with a valid `CreateBookPayload` referencing at least one seeded author `id`.
Verification step (this test case): GET request has no body.

## Expected Status Code
200 OK (for the verification `GET`); the setup `POST` is expected to return `201 Created`.

## Expected Response
JSON array containing the just-created book, with matching `title`, `year`, `price`, `available`, and an
`authors` array whose entries have `firstName`/`lastName` matching the seeded author(s) referenced at
creation time — but with **no `id` field** on those `authors` entries.

## Assertions
- Status assertion: `GET` response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: the newly created book appears in the results with matching `title`, `year`, `price`,
  and `available`.
- Business assertion: the `authors` array on the matching result contains an entry whose `firstName`/
  `lastName` matches the seeded author referenced at creation time.
- Business assertion (confirming the schema finding at the business-flow level): the matching `authors`
  entry does **not** expose an `id` field, even though the book was created by referencing that author's
  `id` in `CreateBookPayload.authors`.

---

## Test Case ID
POS-BOOKS-GET-009

## Scenario
Retrieve a book that has multiple authors and confirm all authors are present in the `authors` array.

## Purpose
Confirm the collection endpoint fully resolves a book's `authors` relationship (not truncated to a single
author) when a book has more than one author, exercising `RestBook.authors`' `uniqueItems: true` array
with more than one element.

### Headers
None required.

### Path Params
None.

### Query Params
- `title`: the title of a known, seeded multi-author book.

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
JSON array containing the book, with an `authors` array containing one entry per distinct author
associated with the book at creation time (confirmed live example: "Refactoring" returned two `authors`
entries, "Martin Fowler" and "Kent Beck").

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: the `authors` array length equals the number of distinct authors seeded for that
  book.
- Business assertion: each seeded author's `firstName`/`lastName` is present exactly once in the `authors`
  array (no duplicates, consistent with `uniqueItems: true`).

# Notes
- The spec does not document whether `title`/`author` filtering is exact-match, case-insensitive, or
  partial/substring match. **Confirmed against the running API:** both are **case-insensitive substring
  matches** (`?title=clean` matched "Clean Code", "Clean Architecture", "The Clean Coder"; `?author=martin`
  matched books whose authors had "Martin" in either `firstName` or `lastName`). POS-BOOKS-GET-002 through
  004 assert this explicitly. This behavior is undocumented in the OpenAPI spec and should be raised with
  the API team as a contract gap.
- The `author` filter matches against **either** `firstName` or `lastName` of **any** author on a book —
  confirmed live where `?author=martin` returned books by "Robert C.Martin" (last-name match), "Martin
  Fowler" (first-name match), and "Martin Kleppmann" (first-name match) in the same result set.
  POS-BOOKS-GET-003/004 isolate the first-name and last-name matching paths individually.
- POS-BOOKS-GET-008/009 depend on the schema finding documented in detail in
  `books-get-schema.scenario.md` (`RestBook`/`RestAuthor` vs. `Book`/`Author` divergence): automation
  relying on this endpoint to obtain an author's `id` (e.g. to chain into `GET /authors/{id}` or
  `DELETE /authors/{id}`) must use a separate lookup — the collection response never exposes it.
- Every filter/data-consistency test seeds its own book (and author, where needed) via `POST /books` /
  `POST /authors` and cleans up afterward, so no test case depends on pre-existing environment data beyond
  what the endpoint's live catalog already contains for read-only happy-path assertions
  (POS-BOOKS-GET-001).
- No pagination, sorting, or `limit`/`offset` query parameters are documented for this endpoint, so no
  pagination scenarios are included.
- No authentication/authorization scheme is declared for this endpoint or globally in the spec, so no
  "valid auth" variant scenarios beyond "no auth header" are applicable.
- Idempotency is not applicable — GET is inherently idempotent and side-effect-free; no dedicated
  idempotency test case is needed beyond repeatability, which is implicitly covered by re-running any test
  case.
