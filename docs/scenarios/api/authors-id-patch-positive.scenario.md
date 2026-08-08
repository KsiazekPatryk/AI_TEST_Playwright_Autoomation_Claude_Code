# Scenario Title
PATCH /authors/{id} — Positive Partial Update Scenarios

# Endpoint Information
- Method: PATCH
- Endpoint: /authors/{id}
- Description: `authors-controller` operation `partialUpdateAuthor`. Partially updates an existing author
  identified by path parameter `id`. The request body accepts an arbitrary JSON object (no formally named
  properties documented), realistically used to update one or both of `firstName`/`lastName` (per the
  sibling `Author` and `UpdateAuthorPayload` schemas — see Notes).

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint.
- A seeded author exists (or is created via `POST /authors` as setup) with a known `id`, `firstName`, and
  `lastName`, so update scenarios have a deterministic starting state and can be verified afterward via
  `GET /authors/{id}`.

# Test Data
- Valid payloads:
  - `{ "firstName": "PatchedFirst" }` — update a single field.
  - `{ "lastName": "PatchedLast" }` — update the other single field.
  - `{ "firstName": "PatchedFirst", "lastName": "PatchedLast" }` — update both fields.
  - `{}` — empty object (no-op partial update; contract-valid since no field is `required`).
- Path params:
  - `id`: a valid, existing author `id` (`integer`, `format: int64`).
- Auth variants: none documented — call without any auth header.
- Boundary values: N/A for request body fields (no length/format constraints documented on `firstName`/
  `lastName`).
- Reusable test values:
  - Seeded author for update scenarios: create via `POST /authors` with a known `firstName`/`lastName`
    prior to each test, or reuse a shared seeded author where test isolation allows.

# Test Cases

## Test Case ID
POS-AUTHORS-PATCH-001

## Scenario
Partially update only the `firstName` of an existing author (happy path).

## Purpose
Confirm a single-field partial update succeeds and the field is persisted, while `lastName` remains
unchanged.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded author with known `firstName`/`lastName`.

### Query Params
None.

### Request Body
`{ "firstName": "PatchedFirst" }`

## Expected Status Code
200 OK

## Expected Response
A JSON object reflecting the update (actual response body shape is undocumented — see schema file Notes).

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: a follow-up `GET /authors/{id}` shows `firstName` equal to `"PatchedFirst"`.
- Business assertion: the follow-up `GET /authors/{id}` shows `lastName` unchanged from its original
  seeded value (confirms partial, not full, replacement).

---

## Test Case ID
POS-AUTHORS-PATCH-002

## Scenario
Partially update only the `lastName` of an existing author.

## Purpose
Confirm updating the other single field succeeds and `firstName` remains unchanged.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded author with known `firstName`/`lastName`.

### Query Params
None.

### Request Body
`{ "lastName": "PatchedLast" }`

## Expected Status Code
200 OK

## Expected Response
A JSON object reflecting the update.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: a follow-up `GET /authors/{id}` shows `lastName` equal to `"PatchedLast"`.
- Business assertion: the follow-up `GET /authors/{id}` shows `firstName` unchanged from its original
  seeded value.

---

## Test Case ID
POS-AUTHORS-PATCH-003

## Scenario
Update both `firstName` and `lastName` in a single request.

## Purpose
Confirm a multi-field partial update applies both changes atomically.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded author.

### Query Params
None.

### Request Body
`{ "firstName": "BothUpdatedFirst", "lastName": "BothUpdatedLast" }`

## Expected Status Code
200 OK

## Expected Response
A JSON object reflecting both updates.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: a follow-up `GET /authors/{id}` shows both `firstName` and `lastName` matching the
  submitted values.

---

## Test Case ID
POS-AUTHORS-PATCH-004

## Scenario
Send an empty request body (no fields to update).

## Purpose
Confirm a no-op partial update (empty object) is accepted and leaves the resource unchanged, since no
field is documented as `required`.

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded author with known `firstName`/`lastName`.

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
- Business assertion: a follow-up `GET /authors/{id}` shows `firstName` and `lastName` unchanged from
  their pre-request values.

---

## Test Case ID
POS-AUTHORS-PATCH-005

## Scenario
Update an author using the same value it already has (idempotent-style update).

## Purpose
Confirm repeating the same partial update produces a consistent, stable result (idempotency check for a
semantically idempotent operation).

### Headers
`Content-Type: application/json`

### Path Params
- `id`: id of a seeded author.

### Query Params
None.

### Request Body
`{ "firstName": "IdempotentFirst" }` (sent twice in sequence).

## Expected Status Code
200 OK (both calls).

## Expected Response
Both calls return a JSON object with the same effective state.

## Assertions
- Status assertion: both requests return status code 200.
- Business assertion: a follow-up `GET /authors/{id}` after either call shows the same `firstName` value
  (`"IdempotentFirst"`), confirming repeated identical PATCH calls converge to the same state.

---

## Test Case ID
POS-AUTHORS-PATCH-006

## Scenario
Call the endpoint without any authentication header.

## Purpose
Confirm the endpoint is accessible without auth, consistent with the spec declaring no security
requirement.

### Headers
`Content-Type: application/json` (no `Authorization` header sent).

### Path Params
- `id`: id of a seeded author.

### Query Params
None.

### Request Body
`{ "firstName": "NoAuthPatch" }`

## Expected Status Code
200 OK

## Expected Response
A JSON object reflecting the update, with no auth-related error.

## Assertions
- Status assertion: response status code equals 200.
- Business assertion: the update is applied successfully with no auth-related error.

---

## Test Case ID
POS-AUTHORS-PATCH-007

## Scenario
Data consistency check — an author updated via PATCH is reflected via `GET /authors` (collection).

## Purpose
Confirm data persistence and consistency between the partial-update operation and the list operation for
this resource.

### Headers
`Content-Type: application/json` (for the PATCH call).

### Path Params
- `id`: id of a seeded author.

### Query Params
- `firstName`: the updated author's new first name (used on the follow-up `GET /authors` call to verify).

### Request Body
`{ "firstName": "ConsistencyCheckFirst" }`

## Expected Status Code
200 OK

## Expected Response
The subsequent `GET /authors?firstName=ConsistencyCheckFirst` call returns the updated author.

## Assertions
- Status assertion: PATCH response status code equals 200.
- Business assertion: the updated author appears in `GET /authors?firstName=ConsistencyCheckFirst` results
  with the new `firstName` value and the same `id`.

# Notes
- The request body schema for this operation is documented generically (`type: object,
  additionalProperties: { type: object }`), not as a named schema with `firstName`/`lastName` properties.
  All test cases assume `firstName`/`lastName` are the patchable fields, based on the sibling `Author` and
  `UpdateAuthorPayload` schemas for this resource — this is an explicit assumption, not a documented
  guarantee, and should be confirmed against the running API.
- The response body schema is a bare `type: object` with no defined shape. Assertions in this file
  therefore verify state changes via a follow-up `GET /authors/{id}` (or `GET /authors` with filtering)
  rather than asserting specific fields directly on the PATCH response body, since the PATCH response
  shape is not contractually guaranteed.
- No pagination, sorting, or additional business rules (e.g. uniqueness constraints on author names) are
  documented for this resource, so no such scenarios are included.
- No authentication/authorization scheme is declared for this endpoint or globally in the spec, so no
  "valid auth" variant scenarios beyond "no auth header" are applicable.
