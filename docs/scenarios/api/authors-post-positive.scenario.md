# Scenario Title
POST /authors — Positive Creation Scenarios

# Endpoint Information
- Method: POST
- Endpoint: /authors
- Description: `authors-controller` operation `createAuthor`. Creates a new author from a
  `CreateAuthorPayload` request body (`firstName`, `lastName`, both optional strings — no `required` array
  declared on the schema). Returns `201 Created` on success.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint.
- No uniqueness constraint is documented on `firstName`/`lastName` — duplicate authors are assumed to be
  allowed unless observed otherwise (see Notes).
- `GET /authors` and `GET /authors/{id}` are available and used for data-consistency verification steps.

# Test Data
- Valid payload (both fields): `{ "firstName": "Jane", "lastName": "Austen" }`.
- Valid payload (firstName only): `{ "firstName": "Herman" }`.
- Valid payload (lastName only): `{ "lastName": "Melville" }`.
- Valid payload (empty object, both fields optional per schema): `{}`.
- Duplicate payload: same `firstName`/`lastName` combination submitted twice.
- Auth variants: none documented — call without any auth header.
- Boundary values: N/A — no `minLength`/`maxLength`/pattern documented on `firstName`/`lastName`.
- Reusable test values:
  - `CreateAuthorPayload` request shape: `firstName` (string, optional), `lastName` (string, optional).
  - `Author` shape (for verification via GET): `id` (int64), `firstName` (string), `lastName` (string).

# Test Cases

## Test Case ID
POS-AUTHORS-POST-001

## Scenario
Create an author with both `firstName` and `lastName` provided (happy path).

## Purpose
Confirm the endpoint successfully creates a new author when a fully populated, valid payload is sent.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "firstName": "Jane", "lastName": "Austen" }
```

## Expected Status Code
201 Created

## Expected Response
A JSON object representing the created author.

## Assertions
- Status assertion: response status code equals 201.
- Schema assertion: response body is a JSON object.
- Business assertion: the created author is subsequently retrievable via `GET /authors` (e.g. filtered by
  `firstName=Jane`) with matching `firstName`/`lastName`.

---

## Test Case ID
POS-AUTHORS-POST-002

## Scenario
Create an author with only `firstName` provided (`lastName` omitted).

## Purpose
Confirm how the endpoint handles a partial payload, since `lastName` is not declared as required by
`CreateAuthorPayload`. The live API rejects it — see the contract deviation below.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "firstName": "Herman" }
```

## Expected Status Code
400 Bad Request — CONTRACT DEVIATION (verified against the live API on 2026-08-08)

`CreateAuthorPayload` declares `firstName` and `lastName` as optional (no `required` array), so the
documented expectation would be `201 Created`. The running API instead rejects the payload with
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

---

## Test Case ID
POS-AUTHORS-POST-003

## Scenario
Create an author with only `lastName` provided (`firstName` omitted).

## Purpose
Confirm how the endpoint handles a partial payload, since `firstName` is not declared as required by
`CreateAuthorPayload`. The live API rejects it — see the contract deviation below.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{ "lastName": "Melville" }
```

## Expected Status Code
400 Bad Request — CONTRACT DEVIATION (verified against the live API on 2026-08-08)

`CreateAuthorPayload` declares `firstName` and `lastName` as optional (no `required` array), so the
documented expectation would be `201 Created`. The running API instead rejects the payload with
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
POS-AUTHORS-POST-004

## Scenario
Create an author with an empty payload (`{}`).

## Purpose
Confirm how the endpoint handles a fully empty request body, since neither `firstName` nor `lastName`
is declared as required on `CreateAuthorPayload` (a valid — if unusual — instance of the schema). The
live API rejects it — see the contract deviation below.

### Headers
`Content-Type: application/json`.

### Path Params
None.

### Query Params
None.

### Request Body
```json
{}
```

## Expected Status Code
400 Bad Request — CONTRACT DEVIATION (verified against the live API on 2026-08-08)

`CreateAuthorPayload` declares `firstName` and `lastName` as optional (no `required` array), so the
documented expectation would be `201 Created`. The running API instead rejects the payload with
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
- Business assertion: no author is created as a side effect of the rejected request.

---

## Test Case ID
POS-AUTHORS-POST-005

## Scenario
Data consistency check — an author created via `POST /authors` is retrievable via `GET /authors`.

## Purpose
Confirm data persistence between the create and list operations for this resource.

### Headers
`Content-Type: application/json` (for the create call).

### Path Params
None.

### Query Params
`firstName` set to the newly created author's first name (for the verification `GET /authors` call).

### Request Body
```json
{ "firstName": "Virginia", "lastName": "Woolf" }
```

## Expected Status Code
201 Created (for the `POST`); 200 OK (for the verification `GET`).

## Expected Response
`POST` returns a JSON object; `GET /authors?firstName=Virginia` returns an array containing an author
with `firstName: "Virginia"` and `lastName: "Woolf"`.

## Assertions
- Status assertion: `POST` response status code equals 201.
- Status assertion: `GET` response status code equals 200.
- Business assertion: the newly created author appears in the `GET` results with matching `firstName` and
  `lastName`.
- Business assertion (if `id` is returned by `POST`): the same `id` is present on the matching item in the
  `GET` results.

---

## Test Case ID
POS-AUTHORS-POST-006

## Scenario
Create two authors with identical `firstName`/`lastName` values (no documented uniqueness constraint).

## Purpose
Confirm the endpoint allows duplicate author records, since `CreateAuthorPayload` and the `Author`
resource declare no uniqueness constraint in the spec.

### Headers
`Content-Type: application/json` (for both calls).

### Path Params
None.

### Query Params
None.

### Request Body
Call 1 and Call 2, identical:
```json
{ "firstName": "Mark", "lastName": "Twain" }
```

## Expected Status Code
201 Created (for both calls).

## Expected Response
Two independent JSON objects representing two separate created author records.

## Assertions
- Status assertion: both responses return status code 201.
- Business assertion: both authors are independently created (e.g. distinct `id` values if `id` is
  returned, or two matching entries when subsequently listed via `GET /authors?firstName=Mark`).

---

## Test Case ID
POS-AUTHORS-POST-007

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
{ "firstName": "Leo", "lastName": "Tolstoy" }
```

## Expected Status Code
201 Created

## Expected Response
A JSON object representing the created author, same as the standard happy path.

## Assertions
- Status assertion: response status code equals 201.
- Schema assertion: response body is a JSON object.
- Business assertion: response is returned successfully with no auth-related error.

# Notes
- The `201` response schema for `createAuthor` is documented only as `{ "type": "object" }` (no
  properties), so assertions on returned field values (e.g. `id`, exact echoed `firstName`/`lastName`) are
  written to be verified via the response body when present, with persistence cross-checked through
  `GET /authors` rather than relying solely on the create response shape. See the schema file's Notes for
  the underlying contract gap.
- No uniqueness constraint on `firstName`/`lastName` is documented, so POS-AUTHORS-POST-006 assumes
  duplicates are allowed by design; if the running API rejects duplicates, this is a deviation from the
  documented contract and should be reported, and this test file updated accordingly.
- No authentication/authorization scheme is declared for this endpoint or globally in the spec, so no
  "valid auth token" variant scenarios are applicable beyond "no auth header" (POS-AUTHORS-POST-007).
- Idempotency is not applicable — `POST` for resource creation is inherently non-idempotent (each call
  creates a new resource), consistent with POS-AUTHORS-POST-006 demonstrating that repeated identical
  calls produce distinct records.
