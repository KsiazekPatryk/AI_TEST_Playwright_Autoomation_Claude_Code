# Scenario Title
GET /authors — Positive Retrieval and Filtering Scenarios

# Endpoint Information
- Method: GET
- Endpoint: /authors
- Description: `authors-controller` operation `getAll_1`. Returns a list of `Author` objects, optionally
  filtered by the query parameters `firstName` and `lastName` (both optional strings).

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint.
- At least one known author exists in the system with a known `firstName` and `lastName`, so filter
  scenarios have a deterministic expected match. Recommend seeding via `POST /authors` before running
  filter-based test cases, since the spec does not guarantee any pre-existing data.

# Test Data
- Valid payload: N/A — GET request, no request body.
- Query params (all optional, `type: string`, no format/enum/length constraints documented):
  - `firstName`: e.g. an existing author's first name (exact value depends on seeded data).
  - `lastName`: e.g. an existing author's last name (exact value depends on seeded data).
- Auth variants: none documented — call without any auth header.
- Boundary values: N/A (no min/max length or numeric constraints documented for query params).
- Reusable test values:
  - `Author` response shape: `id` (int64), `firstName` (string), `lastName` (string).

# Test Cases

## Test Case ID
POS-AUTHORS-GET-001

## Scenario
Retrieve all authors with no filters applied (happy path).

## Purpose
Confirm the base endpoint returns the full author collection successfully.

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
JSON array of `Author` objects representing all authors currently in the system.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: array length is greater than or equal to the number of authors known to be seeded
  for the test.
- Field assertion: at least one returned item contains a valid `id`, `firstName`, and `lastName`.

---

## Test Case ID
POS-AUTHORS-GET-002

## Scenario
Filter authors by `firstName` with a value matching an existing author.

## Purpose
Confirm the `firstName` query parameter filters the collection to matching results.

### Headers
None required.

### Path Params
None.

### Query Params
- `firstName`: value of a known, seeded author's first name.

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
JSON array containing only author(s) whose `firstName` corresponds to the query value.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: every returned item's `firstName` corresponds to the filter value (exact vs.
  partial/case-insensitive match behavior is undocumented — see Notes).
- Business assertion: the seeded author used to build the filter value is present in the results.

---

## Test Case ID
POS-AUTHORS-GET-003

## Scenario
Filter authors by `lastName` with a value matching an existing author.

## Purpose
Confirm the `lastName` query parameter filters the collection to matching results.

### Headers
None required.

### Path Params
None.

### Query Params
- `lastName`: value of a known, seeded author's last name.

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
JSON array containing only author(s) whose `lastName` corresponds to the query value.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: every returned item's `lastName` corresponds to the filter value.
- Business assertion: the seeded author used to build the filter value is present in the results.

---

## Test Case ID
POS-AUTHORS-GET-004

## Scenario
Filter authors by both `firstName` and `lastName` simultaneously.

## Purpose
Confirm combined filtering returns the intersection of both criteria.

### Headers
None required.

### Path Params
None.

### Query Params
- `firstName`: value of a known, seeded author's first name.
- `lastName`: same author's last name.

### Request Body
None.

## Expected Status Code
200 OK

## Expected Response
JSON array containing only the author(s) matching both `firstName` and `lastName`.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: every returned item satisfies both filter criteria simultaneously.
- Business assertion: the target seeded author is present in the results exactly once.

---

## Test Case ID
POS-AUTHORS-GET-005

## Scenario
Filter authors with a value that matches no existing author.

## Purpose
Confirm a non-matching filter returns a successful empty result rather than an error.

### Headers
None required.

### Path Params
None.

### Query Params
- `firstName`: a value guaranteed not to match any seeded author (e.g. a random unique string).

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
POS-AUTHORS-GET-006

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
JSON array of `Author` objects, same as the unfiltered happy path.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: response is returned successfully with no auth-related error.

---

## Test Case ID
POS-AUTHORS-GET-007

## Scenario
Data consistency check — an author created via `POST /authors` is retrievable via `GET /authors`.

## Purpose
Confirm data persistence and consistency between the create and list operations for this resource.

### Headers
`Content-Type: application/json` (for the setup `POST /authors` call).

### Path Params
None.

### Query Params
- `firstName`: the newly created author's first name (to validate via filtering).

### Request Body
Setup step: `POST /authors` with a valid `CreateAuthorPayload` (`firstName`, `lastName`).
Verification step (this test case): GET request has no body.

## Expected Status Code
200 OK

## Expected Response
JSON array containing the just-created author, with matching `firstName`/`lastName` and a populated `id`.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is an array.
- Business assertion: the newly created author appears in the results with a non-null `id`.
- Business assertion: `firstName` and `lastName` in the response exactly match the values sent on create.

# Notes
- The spec does not document whether `firstName`/`lastName` filtering is exact-match, case-insensitive,
  or partial/substring match. Assertions in POS-AUTHORS-GET-002/003/004 are written generically
  ("corresponds to the filter value") to avoid assuming undocumented matching semantics — the automation
  agent should confirm actual matching behavior against the running API and tighten the assertion once
  confirmed, then update this file.
- No pagination, sorting, or `limit`/`offset` query parameters are documented for this endpoint, so no
  pagination scenarios are included.
- No authentication/authorization scheme is declared for this endpoint or globally in the spec, so no
  "valid auth" variant scenarios beyond "no auth header" are applicable.
- Idempotency is not applicable — GET is inherently idempotent and side-effect-free; no dedicated
  idempotency test case is needed beyond repeatability, which is implicitly covered by re-running any
  test case.
