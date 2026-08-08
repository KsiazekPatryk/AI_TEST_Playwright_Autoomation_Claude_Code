# Scenario Title
DELETE /authors/{id} — Negative and Robustness Scenarios

# Endpoint Information
- Method: DELETE
- Endpoint: /authors/{id}
- Description: `authors-controller` operation `deleteById_1`. The OpenAPI spec documents only a single
  response — `204 No Content` with no declared body. No error responses (e.g. `400`, `401`, `403`, `404`,
  `409`, `500`) are documented for this operation, including no documented `404` for a non-existent `id`
  and no documented `409` for a referential-integrity conflict (e.g. deleting an author still referenced
  by a book). This file therefore focuses on documented-absence gaps and API robustness for invalid path
  parameters, non-existent resources, repeated deletions, and undocumented business rules, rather than
  asserting invented error codes.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint, so no unauthorized/forbidden test cases apply (see
  Notes).
- The `id` path parameter is declared `required: true` with `type: integer, format: int64` — this is the
  one explicit path-level constraint documented in the spec and is exercised in this file.
- A known, existing author `id` (seeded via `POST /authors`) is available where a syntactically valid but
  otherwise-uninvolved `id` is needed as a control/baseline.
- An `id` value known NOT to correspond to any existing author is available (e.g. a very large, unused
  integer).
- `POST /books` is available to seed a book referencing an author, to exercise the referential-integrity
  scenario.

# Test Data
- Valid path param (baseline for comparison): `id` of a pre-existing, seeded author.
- Invalid path params:
  - Non-existent `id`: a numeric `id` value guaranteed not to correspond to any existing author.
  - Non-numeric `id`: `"abc"` (violates documented `type: integer` on the path param).
  - Negative `id`: `-1` (numeric but semantically invalid; no documented `minimum` constraint, so this is
    a robustness check).
  - Zero `id`: `0` (no documented `minimum` constraint; robustness check).
  - Decimal `id`: `1.5` (violates documented `integer` type, which excludes fractional values).
- Business/state scenarios:
  - `id` of an author already deleted in a prior step of the same test (repeated deletion of the same
    resource).
  - `id` of an author currently referenced by an existing book's `authors` array (referential-integrity
    conflict, undocumented).
- Route-level scenario:
  - `DELETE` sent to the collection path `/authors` (no `id` segment) — the spec defines only `GET` and
    `POST` for `/authors`; `DELETE` is not a documented method for that path.
- Reusable test values:
  - Known seeded author `id` (for isolating "invalid path param" failures from "resource doesn't exist"
    failures).
  - Known non-existent `id` (for resource-not-found scenarios).

# Test Cases

## Test Case ID
NEG-AUTHORS-DELETE-001

## Scenario
Attempt to delete an author using a non-existent `id`.

## Purpose
Confirm the API's behavior when the target resource does not exist, since no `404` (or any error)
response is documented for `deleteById_1`.

### Headers
None required.

### Path Params
- `id`: a numeric value guaranteed not to correspond to any existing author.

### Query Params
None.

### Request Body
(none)

## Expected Status Code
Not documented in the OpenAPI spec (only `204` is defined for this operation, with no `404`). Execute and
record the actual status code; a `204` (silently no-op'ing) or a `5xx` server error are both flagged as
contract-gap/robustness findings.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against. A `404 Not Found`
would be the conventionally expected outcome but is not guaranteed by the spec.

## Assertions
- Status assertion: response status code is captured and is not an unhandled `5xx` crash.
- Business assertion: no unintended side effect occurs (e.g. no other author is unintentionally affected)
  — recorded as a contract-gap finding.

---

## Test Case ID
NEG-AUTHORS-DELETE-002

## Scenario
Attempt to delete an author using a non-numeric `id` (`"abc"`).

## Purpose
Confirm the API enforces the documented `type: integer, format: int64` constraint on the `id` path
parameter.

### Headers
None required.

### Path Params
- `id`: `abc`

### Query Params
None.

### Request Body
(none)

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; commonly a `400`-class
response would be expected from path-variable type conversion, but this is not documented and must not be
asserted as guaranteed. A `5xx` response is flagged as a robustness defect.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not `204`, and not an unhandled `5xx` crash.
- Schema assertion: if a JSON error body is returned, it is well-formed.

---

## Test Case ID
NEG-AUTHORS-DELETE-003

## Scenario
Attempt to delete an author using a negative `id` (`-1`).

## Purpose
Confirm the API handles a numerically valid but semantically implausible `id` gracefully (no documented
`minimum` constraint exists on this path parameter, so this is a robustness/contract-gap check).

### Headers
None required.

### Path Params
- `id`: `-1`

### Query Params
None.

### Request Body
(none)

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed; a not-found-style response is conventionally expected but not
documented.

## Assertions
- Status assertion: response status code is captured and is not `204` (no author should be deleted for a
  negative, non-existent `id`), and not an unhandled `5xx` crash.

---

## Test Case ID
NEG-AUTHORS-DELETE-004

## Scenario
Attempt to delete an author using a zero `id` (`0`).

## Purpose
Confirm the API handles a numerically valid but semantically implausible `id` gracefully (no documented
`minimum` constraint exists on this path parameter).

### Headers
None required.

### Path Params
- `id`: `0`

### Query Params
None.

### Request Body
(none)

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not `204`, and not an unhandled `5xx` crash.

---

## Test Case ID
NEG-AUTHORS-DELETE-005

## Scenario
Attempt to delete an author using a decimal `id` (`1.5`).

## Purpose
Confirm the API enforces the documented `integer` type (which excludes fractional values) on the `id`
path parameter.

### Headers
None required.

### Path Params
- `id`: `1.5`

### Query Params
None.

### Request Body
(none)

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; a `5xx` response is a
robustness defect.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not `204`, and not an unhandled `5xx` crash.

---

## Test Case ID
NEG-AUTHORS-DELETE-006

## Scenario
Delete an existing author, then immediately attempt to delete the same `id` a second time.

## Purpose
Confirm the API's behavior on a repeated deletion of an already-removed resource, since `DELETE` is
conventionally expected to be idempotent in outcome (end-state: resource absent) but no documented
response exists for a second call against a now-nonexistent resource.

### Headers
None required.

### Path Params
- `id`: id of a freshly seeded author (same value used for both calls).

### Query Params
None.

### Request Body
(none)

## Expected Status Code
First call: `204 No Content` (documented). Second call: not documented — commonly a `404`-class response
would be conventionally expected, or a repeated `204` if the API treats deletion as idempotent by design;
neither is guaranteed by the spec. A `5xx` response on the second call is flagged as a robustness defect.

## Expected Response
First call returns no body. Second call's actual status/body is recorded as a contract-gap finding either
way (both a `204` and a `404` are defensible designs, but neither is documented).

## Assertions
- Status assertion: first call's response status code equals 204.
- Status assertion: second call's response status code is captured and is not an unhandled `5xx` crash.
- Business assertion: the second call does not affect any other author record.

---

## Test Case ID
NEG-AUTHORS-DELETE-007

## Scenario
Attempt to delete an author that is currently referenced by an existing book (via the book's `authors`
array).

## Purpose
Confirm the API's referential-integrity behavior when deleting an author still linked to a book, since no
`409 Conflict` (or any other documented response) exists for this scenario, and `Book.authors` is
documented as an array of `Author` objects with no cascade/restrict behavior specified.

### Headers
None required.

### Path Params
- `id`: id of an author that is referenced in the `authors` array of a pre-existing, seeded book (created
  via `POST /books`).

### Query Params
None.

### Request Body
(none)

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; whether the API blocks the
deletion (e.g. `409`/`400`-class), cascades the deletion (removing the author from the book), or silently
orphans the reference is undocumented. A `5xx` response is flagged as a robustness defect.

## Expected Response
Actual behavior must be observed and recorded as a contract-gap/business-rule finding regardless of
outcome, since the spec does not define referential-integrity handling between `Author` and `Book`.

## Assertions
- Status assertion: response status code is captured and is not an unhandled `5xx` crash.
- Business assertion: a subsequent `GET /books/{id}` for the referencing book is executed to record
  whether the book still exists, whether it still lists the deleted author, or whether the response is
  otherwise affected — documented as a contract-gap finding for the API team to clarify.

---

## Test Case ID
NEG-AUTHORS-DELETE-008

## Scenario
Send a `DELETE` request to the collection path `/authors` (no `id` path segment).

## Purpose
Confirm the API's behavior for an undocumented method/route combination, since the spec defines only
`GET` (`getAll_1`) and `POST` (`createAuthor`) for `/authors`, with no `DELETE` operation declared at the
collection level.

### Headers
None required.

### Path Params
None (request targets `/authors`, not `/authors/{id}`).

### Query Params
None.

### Request Body
(none)

## Expected Status Code
Not documented in the OpenAPI spec for this route/method combination. Execute and record the actual
status code; a `405 Method Not Allowed` would be the conventionally expected framework behavior, but this
is not documented and must not be asserted as guaranteed. A `5xx` response is flagged as a robustness
defect.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not `204` (no bulk deletion of all authors
  should occur for an undocumented route), and not an unhandled `5xx` crash.
- Business assertion: `GET /authors` after this call confirms no unintended bulk deletion occurred.

# Notes
- The OpenAPI spec documents only the `204` response for `DELETE /authors/{id}`. No `400`, `401`, `403`,
  `404`, `409`, or `500` responses are declared for this operation — notably including no `404` for a
  non-existent `id` and no `409` for a referential-integrity conflict with a book. Per the "never assume
  undocumented behavior" rule, none of the test cases in this file assert a specific documented error
  status code — they instead capture actual behavior and flag deviations (especially `5xx` server errors
  and silent unintended side effects) as robustness/contract-gap findings for the API team.
- The one explicit contract constraint documented is the `id` path parameter's `type: integer, format:
  int64`. This is exercised directly in NEG-AUTHORS-DELETE-002/003/004/005.
- No authentication or authorization is documented for this endpoint (no `security` requirement, no
  `securitySchemes` component in the spec). Standard "unauthorized access" / "forbidden access" negative
  cases from the template are therefore not applicable and have been omitted rather than invented.
- No request body applies to this operation (no `requestBody` declared), so malformed-JSON,
  wrong-field-type, and unsupported-`Content-Type` negative cases from the `PUT`/`PATCH` counterparts do
  not apply here and have been omitted rather than invented.
- The referential-integrity scenario (NEG-AUTHORS-DELETE-007) is included as a business-critical case
  despite being undocumented, because `Book.authors` explicitly models a relationship to `Author` in the
  spec's schemas; the actual delete behavior (block, cascade, or orphan) is a high-value finding to report
  to the API team regardless of documentation gaps.
- If the API team documents error responses for this endpoint in the future (e.g. `404` for a non-existent
  `id`, `409` for a referenced author, `405` for the collection-level route), this file must be updated to
  assert those specific documented status codes and bodies.
- NEG-AUTHORS-DELETE-009 (added during implementation) covers authentication robustness: the spec declares no
  `securitySchemes` and no `security` requirement, so a syntactically valid but unparseable bearer token
  must either be ignored (`204`) or rejected cleanly (`401`). The live API instead returns
  `500 {"message":"Invalid token"}` for `DELETE /authors/{id}`, the same defect already recorded for
  `GET /authors` in NEG-AUTHORS-GET-006. The test is marked `test.fail()` so the defect stays visible in
  reports and the test turns red the moment the API is fixed.
