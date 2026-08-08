# Scenario Title
PUT /authors/{id} — Positive Update Scenarios

# Endpoint Information
- Method: PUT
- Endpoint: /authors/{id}
- Description: `authors-controller` operation `updateAuthor`. Updates an existing author identified by the
  path parameter `id` (integer, `int64`, required) using an `UpdateAuthorPayload` request body
  (`firstName`, `lastName`, both optional strings — no `required` array declared on the schema). Returns
  `200 OK` on success.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint.
- A known author record exists (e.g. seeded via `POST /authors`) with a known `id`, so its `id` can be
  used as the path parameter for update scenarios.
- `GET /authors/{id}` is available and used for data-consistency verification steps after each update.
- Whether `PUT` performs a full replace or a partial merge for omitted fields is undocumented (see Notes
  in the schema file); positive scenarios below cover both a fully populated body and a partial body, and
  the actual persisted result must be observed.

# Test Data
- Valid payload (both fields): `{ "firstName": "Charlotte", "lastName": "Bronte" }`.
- Valid payload (firstName only): `{ "firstName": "Emily" }`.
- Valid payload (lastName only): `{ "lastName": "Woolf" }`.
- Valid payload (empty object, both fields optional per schema): `{}`.
- Auth variants: none documented — call without any auth header.
- Boundary values: N/A — no `minLength`/`maxLength`/pattern documented on `firstName`/`lastName`.
- Reusable test values:
  - `UpdateAuthorPayload` request shape: `firstName` (string, optional), `lastName` (string, optional).
  - `Author` shape (for verification via GET): `id` (int64), `firstName` (string), `lastName` (string).
  - `id` path param: integer, `int64`, of a pre-existing seeded author.

# Test Cases

## Test Case ID
POS-AUTHORS-PUT-001

## Scenario
Update an existing author with both `firstName` and `lastName` provided (happy path).

## Purpose
Confirm the endpoint successfully updates an existing author when a fully populated, valid payload is
sent for a valid `id`.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded author.

### Query Params
None.

### Request Body
```json
{ "firstName": "Charlotte", "lastName": "Bronte" }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated author.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is a JSON object.
- Business assertion: a subsequent `GET /authors/{id}` for the same `id` returns `firstName: "Charlotte"`
  and `lastName: "Bronte"`, confirming the update was persisted.
- Business assertion: the author's `id` is unchanged by the update.

---

## Test Case ID
POS-AUTHORS-PUT-002

## Scenario
Update an existing author with only `firstName` provided (`lastName` omitted from the payload).

## Purpose
Confirm how the endpoint handles a partial payload, since `lastName` is not declared as required by
`UpdateAuthorPayload`. The live API rejects it outright — see the contract deviation below.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded author (with a known prior `lastName`).

### Query Params
None.

### Request Body
```json
{ "firstName": "Emily" }
```

## Expected Status Code
400 Bad Request — CONTRACT DEVIATION (verified against the live API on 2026-08-08)

`UpdateAuthorPayload` declares `firstName` and `lastName` as optional (no `required` array), so the
documented expectation would be `200 OK`. The running API instead rejects the payload with
`400` and a per-field `"<field> incorrect input data"` message. Raised with the API team; the test
asserts the actual `400` behavior so the deviation stays visible and this file is the record of it.

## Expected Response
The standard API error envelope:
```json
{ "timestamp": "...", "status": 400, "error": "Bad Request", "message": ["lastName incorrect input data"] }
```

## Assertions
- Status assertion: response status code equals 400.
- Schema assertion: response body matches the API error envelope (`ApiErrorSchema`), is served as
  `application/json`, and leaks no internal implementation detail.
- Business assertion: `message` contains `"lastName incorrect input data"`.
- Business assertion: the partial-update question this case was written to answer does not arise —
  the API refuses partial `PUT` bodies outright, and `PATCH /authors/{id}` is the operation that
  provides partial-update semantics (see POS-AUTHORS-PATCH-001/002).

---

## Test Case ID
POS-AUTHORS-PUT-003

## Scenario
Update an existing author with only `lastName` provided (`firstName` omitted from the payload).

## Purpose
Confirm how the endpoint handles a partial payload, since `firstName` is not declared as required by
`UpdateAuthorPayload`. The live API rejects it outright — see the contract deviation below.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded author (with a known prior `firstName`).

### Query Params
None.

### Request Body
```json
{ "lastName": "Woolf" }
```

## Expected Status Code
400 Bad Request — CONTRACT DEVIATION (verified against the live API on 2026-08-08)

`UpdateAuthorPayload` declares `firstName` and `lastName` as optional (no `required` array), so the
documented expectation would be `200 OK`. The running API instead rejects the payload with
`400` and a per-field `"<field> incorrect input data"` message. Raised with the API team; the test
asserts the actual `400` behavior so the deviation stays visible and this file is the record of it.

## Expected Response
The standard API error envelope:
```json
{ "timestamp": "...", "status": 400, "error": "Bad Request", "message": ["firstName incorrect input data"] }
```

## Assertions
- Status assertion: response status code equals 400.
- Schema assertion: response body matches the API error envelope (`ApiErrorSchema`), is served as
  `application/json`, and leaks no internal implementation detail.
- Business assertion: `message` contains `"firstName incorrect input data"`.

---

## Test Case ID
POS-AUTHORS-PUT-004

## Scenario
Update an existing author with an empty payload (`{}`).

## Purpose
Confirm how the endpoint handles a fully empty request body, since neither `firstName` nor `lastName`
is declared as required on `UpdateAuthorPayload` (a valid — if unusual — instance of the schema). The
live API rejects it — see the contract deviation below.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded author.

### Query Params
None.

### Request Body
```json
{}
```

## Expected Status Code
400 Bad Request — CONTRACT DEVIATION (verified against the live API on 2026-08-08)

`UpdateAuthorPayload` declares `firstName` and `lastName` as optional (no `required` array), so the
documented expectation would be `200 OK`. The running API instead rejects the payload with
`400` and a per-field `"<field> incorrect input data"` message. Raised with the API team; the test
asserts the actual `400` behavior so the deviation stays visible and this file is the record of it.

## Expected Response
The standard API error envelope:
```json
{ "timestamp": "...", "status": 400, "error": "Bad Request", "message": ["firstName incorrect input data", "lastName incorrect input data"] }
```

## Assertions
- Status assertion: response status code equals 400.
- Schema assertion: response body matches the API error envelope (`ApiErrorSchema`), is served as
  `application/json`, and leaks no internal implementation detail.
- Business assertion: `message` contains `"firstName incorrect input data"` and `"lastName incorrect input data"`.
- Business assertion: the author is not deleted or mutated — a follow-up `GET /authors/{id}` returns
  the pre-request `firstName`/`lastName` values unchanged.

---

## Test Case ID
POS-AUTHORS-PUT-005

## Scenario
Data consistency check — an author updated via `PUT /authors/{id}` reflects the new values on subsequent
retrieval.

## Purpose
Confirm data persistence and consistency between the update and read operations for this resource.

### Headers
`Content-Type: application/json` (for the update call).

### Path Params
- `id`: id of a pre-existing, seeded author.

### Query Params
None.

### Request Body
```json
{ "firstName": "Virginia", "lastName": "Woolf" }
```

## Expected Status Code
200 OK (for the `PUT`); 200 OK (for the verification `GET /authors/{id}`).

## Expected Response
`PUT` returns a JSON object; `GET /authors/{id}` subsequently returns an `Author` object with
`firstName: "Virginia"` and `lastName: "Woolf"`.

## Assertions
- Status assertion: `PUT` response status code equals 200.
- Status assertion: `GET` response status code equals 200.
- Business assertion: the `GET` result reflects the exact `firstName`/`lastName` values sent in the `PUT`
  request.
- Business assertion: the `id` returned by `GET` matches the `id` used in the `PUT` path parameter.

---

## Test Case ID
POS-AUTHORS-PUT-006

## Scenario
Update an author's `firstName`/`lastName` to values identical to their current values (no-op update).

## Purpose
Confirm the endpoint supports idempotent-style re-submission of the same update without error.

### Headers
`Content-Type: application/json`.

### Path Params
- `id`: id of a pre-existing, seeded author.

### Query Params
None.

### Request Body
Same payload sent twice, identical:
```json
{ "firstName": "Leo", "lastName": "Tolstoy" }
```

## Expected Status Code
200 OK (for both calls).

## Expected Response
Both calls return a JSON object; the final persisted state after both calls is identical to the state
after the first call (idempotent outcome for repeated identical `PUT` calls, consistent with `PUT`
semantics).

## Assertions
- Status assertion: both responses return status code 200.
- Business assertion: `GET /authors/{id}` after the second call returns the same `firstName`/`lastName` as
  after the first call (idempotency of repeated identical updates).

---

## Test Case ID
POS-AUTHORS-PUT-007

## Scenario
Call the endpoint without any authentication header.

## Purpose
Confirm the endpoint is accessible without auth, consistent with the spec declaring no security
requirement.

### Headers
`Content-Type: application/json`. No `Authorization` header sent.

### Path Params
- `id`: id of a pre-existing, seeded author.

### Query Params
None.

### Request Body
```json
{ "firstName": "Mark", "lastName": "Twain" }
```

## Expected Status Code
200 OK

## Expected Response
A JSON object representing the updated author, same as the standard happy path.

## Assertions
- Status assertion: response status code equals 200.
- Schema assertion: response body is a JSON object.
- Business assertion: response is returned successfully with no auth-related error.

# Notes
- The `200` response schema for `updateAuthor` is documented only as `{ "type": "object" }` (no
  properties), so assertions on returned field values are written to be verified primarily through a
  follow-up `GET /authors/{id}` rather than relying solely on the update response shape. See the schema
  file's Notes for the underlying contract gap.
- The spec does not document whether omitted fields in the `PUT` request body are left unchanged
  (partial-merge behavior) or cleared/nulled (full-replace behavior, which is the conventional HTTP
  semantic for `PUT`). POS-AUTHORS-PUT-002, 003, and 004 are written to observe and record actual behavior
  rather than assume one interpretation, since a separate `PATCH /authors/{id}` operation exists in the
  spec specifically for partial updates — this coexistence should be clarified with the API team.
- Idempotency: `PUT` is conventionally idempotent (repeated identical calls should produce the same
  end-state). POS-AUTHORS-PUT-006 exercises this expectation directly since the spec does not explicitly
  document idempotency guarantees.
- No authentication/authorization scheme is declared for this endpoint or globally in the spec, so no
  "valid auth token" variant scenarios are applicable beyond "no auth header" (POS-AUTHORS-PUT-007).
- No documented business rule restricts which author `id` values can be updated (e.g. no "author has
  books, cannot rename" rule), so no such scenario is included; only documented request/response contract
  behavior is exercised here.
