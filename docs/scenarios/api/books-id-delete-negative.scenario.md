# Scenario Title
DELETE /books/{id} — Negative and Robustness Scenarios

# Endpoint Information
- Method: DELETE
- Endpoint: /books/{id}
- Description: `books-controller` operation `deleteById`. The OpenAPI spec documents only a single
  response — `204 No Content` with no declared body. No error responses (e.g. `400`, `401`, `403`, `404`,
  `409`, `500`) are documented for this operation, including no documented `404` for a non-existent `id`
  and no documented `409` for a referential-integrity conflict (e.g. deleting a book still referenced by an
  existing order). This file therefore focuses on documented-absence gaps and API robustness for invalid
  path parameters, non-existent resources, repeated deletions, and undocumented business rules, rather than
  asserting invented error codes.

# Preconditions
- API base URL is reachable (`API_URL` from `.env`).
- No authentication is documented for this endpoint, so no unauthorized/forbidden test cases apply (see
  Notes).
- The `id` path parameter is declared `required: true` with `type: integer, format: int64` — this is the
  one explicit path-level constraint documented in the spec and is exercised in this file.
- A known, existing book `id` (seeded via `POST /books`, which itself requires an existing author `id`) is
  available where a syntactically valid but otherwise-uninvolved `id` is needed as a control/baseline.
- An `id` value known NOT to correspond to any existing book is available (e.g. a very large, unused
  integer).
- `POST /orders` is available to seed an order that references a book (via `CreateOrderPayload.items[].bookId`),
  to exercise the referential-integrity scenario.

# Test Data
- Valid path param (baseline for comparison): `id` of a pre-existing, seeded book.
- Invalid path params:
  - Non-existent `id`: a numeric `id` value guaranteed not to correspond to any existing book.
  - Non-numeric `id`: `"abc"` (violates documented `type: integer` on the path param).
  - Negative `id`: `-1` (numeric but semantically invalid; no documented `minimum` constraint, so this is a
    robustness check).
  - Zero `id`: `0` (no documented `minimum` constraint; robustness check).
  - Decimal `id`: `1.5` (violates documented `integer` type, which excludes fractional values).
- Business/state scenarios:
  - `id` of a book already deleted in a prior step of the same test (repeated deletion of the same
    resource).
  - `id` of a book currently referenced by an existing order's `items` array (referential-integrity
    conflict, undocumented — the natural counterpart to the `Author`-referenced-by-`Book` gap already
    recorded for `DELETE /authors/{id}`, but here on the `Order`/`OrderItem` → `Book` relationship, since
    `Book` does not itself reference `Author` back and thus poses no equivalent risk toward `Author`).
  - `id` of a book that has an uploaded cover set (`coverId` populated via `PATCH /books/{id}/cover`) —
    undocumented cascade/orphan behavior for the associated upload.
- Route-level scenario:
  - `DELETE` sent to the collection path `/books` (no `id` segment) — the spec defines only `GET` and
    `POST` for `/books`; `DELETE` is not a documented method for that path.
- Reusable test values:
  - Known seeded book `id` (for isolating "invalid path param" failures from "resource doesn't exist"
    failures).
  - Known non-existent `id` (for resource-not-found scenarios).

# Test Cases

## Test Case ID
NEG-BOOKS-DELETE-001

## Scenario
Attempt to delete a book using a non-existent `id`.

## Purpose
Confirm the API's behavior when the target resource does not exist, since no `404` (or any error) response
is documented for `deleteById`.

### Headers
None required.

### Path Params
- `id`: a numeric value guaranteed not to correspond to any existing book.

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
- Business assertion: no unintended side effect occurs (e.g. no other book is unintentionally affected) —
  recorded as a contract-gap finding.

---

## Test Case ID
NEG-BOOKS-DELETE-002

## Scenario
Attempt to delete a book using a non-numeric `id` (`"abc"`).

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
NEG-BOOKS-DELETE-003

## Scenario
Attempt to delete a book using a negative `id` (`-1`).

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
- Status assertion: response status code is captured and is not `204` (no book should be deleted for a
  negative, non-existent `id`), and not an unhandled `5xx` crash.

---

## Test Case ID
NEG-BOOKS-DELETE-004

## Scenario
Attempt to delete a book using a zero `id` (`0`).

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
NEG-BOOKS-DELETE-005

## Scenario
Attempt to delete a book using a decimal `id` (`1.5`).

## Purpose
Confirm the API enforces the documented `integer` type (which excludes fractional values) on the `id` path
parameter.

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
NEG-BOOKS-DELETE-006

## Scenario
Delete an existing book, then immediately attempt to delete the same `id` a second time.

## Purpose
Confirm the API's behavior on a repeated deletion of an already-removed resource, since `DELETE` is
conventionally expected to be idempotent in outcome (end-state: resource absent) but no documented response
exists for a second call against a now-nonexistent resource.

### Headers
None required.

### Path Params
- `id`: id of a freshly seeded book (same value used for both calls).

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
- Business assertion: the second call does not affect any other book record.

---

## Test Case ID
NEG-BOOKS-DELETE-007

## Scenario
Attempt to delete a book that is currently referenced by an existing order (via the order's `items` array,
which links to `Book` through `OrderItem.book`).

## Purpose
Confirm the API's referential-integrity behavior when deleting a book still linked to an order, since no
`409 Conflict` (or any other documented response) exists for this scenario, and `RichOrder.items[].book`
(`OrderItem.book`) is documented as a `Book` reference with no cascade/restrict behavior specified. This is
the natural counterpart, on the "book is referenced by something else" side, to the referential-integrity
gap already recorded for `DELETE /authors/{id}` (`authors-id-delete-negative.scenario.md`,
NEG-AUTHORS-DELETE-007) — but here the referencing resource is an `Order`, not the book's own `authors`
array (deleting a book has no documented or logically necessary effect on the `Author` records it lists;
see `books-id-delete-positive.scenario.md`, POS-BOOKS-DELETE-005, for that simpler, already-verified
direction).

### Headers
None required.

### Path Params
- `id`: id of a book that is referenced in the `items` array of a pre-existing, seeded order (created via
  `POST /orders` with `CreateOrderPayload.items[].bookId` set to this book's id).

### Query Params
None.

### Request Body
(none)

## Expected Status Code
Not documented in the OpenAPI spec. Execute and record the actual status code; whether the API blocks the
deletion (e.g. `409`/`400`-class), cascades the deletion (removing/nulling the item from the order),
allows it and leaves a dangling reference, or errors unexpectedly is undocumented. A `5xx` response is
flagged as a robustness defect.

## Expected Response
Actual behavior must be observed and recorded as a contract-gap/business-rule finding regardless of
outcome, since the spec does not define referential-integrity handling between `Order`/`OrderItem` and
`Book`.

## Assertions
- Status assertion: response status code is captured and is not an unhandled `5xx` crash.
- Business assertion: a subsequent `GET /orders/{id}` for the referencing order is executed to record
  whether the order still exists, whether its `items` array still lists the deleted book (and in what
  shape), or whether the response is otherwise affected — documented as a contract-gap finding for the API
  team to clarify.

---

## Test Case ID
NEG-BOOKS-DELETE-008

## Scenario
Attempt to delete a book that has an uploaded cover image associated with it (`coverId` populated via
`PATCH /books/{id}/cover`).

## Purpose
Confirm the API's behavior regarding the book's owned cover upload when the book itself is deleted, since
`Book.coverId` is documented as an `integer(int64)` reference and `/uploads/{id}` exposes the upload's
metadata/file, but no documented behavior specifies whether the cover upload is deleted, orphaned, or left
retrievable after its owning book is removed.

### Headers
None required.

### Path Params
- `id`: id of a book with a previously uploaded cover (`coverId` set via a prior `PATCH /books/{id}/cover`
  call).

### Query Params
None.

### Request Body
(none)

## Expected Status Code
204 No Content, per the documented contract for `deleteById` (this status is not conditional on cover
presence in the spec). Execute and record any deviation as a robustness defect.

## Expected Response
No response body for the `DELETE` itself. The subsequent state of the associated upload
(`GET /uploads/{id}`) is undocumented and must be observed.

## Assertions
- Status assertion: response status code equals 204.
- Business assertion: a subsequent `GET /uploads/{id}` call for the book's former `coverId` is executed and
  its actual status/body is recorded — documented as a contract-gap finding (orphaned upload vs. cascaded
  deletion vs. some other behavior) rather than asserted as a specific guaranteed outcome.

---

## Test Case ID
NEG-BOOKS-DELETE-009

## Scenario
Send a `DELETE` request to the collection path `/books` (no `id` path segment).

## Purpose
Confirm the API's behavior for an undocumented method/route combination, since the spec defines only `GET`
(`getAll`) and `POST` (`createBook`) for `/books`, with no `DELETE` operation declared at the collection
level.

### Headers
None required.

### Path Params
None (request targets `/books`, not `/books/{id}`).

### Query Params
None.

### Request Body
(none)

## Expected Status Code
Not documented in the OpenAPI spec for this route/method combination. Execute and record the actual status
code; a `405 Method Not Allowed` would be the conventionally expected framework behavior, but this is not
documented and must not be asserted as guaranteed. A `5xx` response is flagged as a robustness defect.

## Expected Response
Actual behavior must be observed; no documented error body exists to assert against.

## Assertions
- Status assertion: response status code is captured and is not `204` (no bulk deletion of all books should
  occur for an undocumented route), and not an unhandled `5xx` crash.
- Business assertion: `GET /books` after this call confirms no unintended bulk deletion occurred.

# Notes
- The OpenAPI spec documents only the `204` response for `DELETE /books/{id}`. No `400`, `401`, `403`,
  `404`, `409`, or `500` responses are declared for this operation — notably including no `404` for a
  non-existent `id` and no `409` for a referential-integrity conflict with an order. Per the "never assume
  undocumented behavior" rule, none of the test cases in this file assert a specific documented error
  status code — they instead capture actual behavior and flag deviations (especially `5xx` server errors
  and silent unintended side effects) as robustness/contract-gap findings for the API team.
- The one explicit contract constraint documented is the `id` path parameter's `type: integer, format:
  int64`. This is exercised directly in NEG-BOOKS-DELETE-002/003/004/005.
- **Order referential integrity (key finding, NEG-BOOKS-DELETE-007):** `RichOrder.items` is an array of
  `OrderItem`, and `OrderItem.book` is documented as a `Book` reference — this is the real,
  business-critical inverse-relationship risk for this endpoint (as opposed to `Book → Author`, which is
  one-directional and does not put `Author` records at risk when a book is deleted; see
  `books-id-delete-positive.scenario.md`, POS-BOOKS-DELETE-005, which verifies that simpler direction
  directly). Whether deleting a referenced book is blocked, cascades, or silently orphans the order's item
  data is undocumented and is flagged as a high-value finding for the API team to clarify, mirroring
  NEG-AUTHORS-DELETE-007 in `authors-id-delete-negative.scenario.md`.
- **Cover upload orphan risk (NEG-BOOKS-DELETE-008):** `Book.coverId` references an upload exposed via
  `/uploads/{id}` and `/uploads/{id}/file`, managed through `PATCH /books/{id}/cover` /
  `DELETE /books/{id}/cover`. The spec does not document whether deleting the owning book also removes the
  cover upload or leaves it orphaned/retrievable. This is a lower-risk but still undocumented gap (the
  cover is owned by the book, not shared with other resources) and is included for completeness.
- No authentication or authorization is documented for this endpoint (no `security` requirement, no
  `securitySchemes` component in the spec). Standard "unauthorized access" / "forbidden access" negative
  cases from the template are therefore not applicable and have been omitted rather than invented.
- No request body applies to this operation (no `requestBody` declared), so malformed-JSON,
  wrong-field-type, and unsupported-`Content-Type` negative cases from the `PUT`/`PATCH` counterparts do
  not apply here and have been omitted rather than invented.
- If the API team documents error responses for this endpoint in the future (e.g. `404` for a non-existent
  `id`, `409` for a book referenced by an order, `405` for the collection-level route), this file must be
  updated to assert those specific documented status codes and bodies.
