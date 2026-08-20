# Edit a Book and Add a Second Author

# Setup (API)
1. Create Author A through `POST /authors` (via `authorsApiSteps.createAuthor()`), using a random
   `firstName`/`lastName` payload (`getRandomAuthorPayload()`).
2. Create Author B through `POST /authors` (via `authorsApiSteps.createAuthor()`), using a second,
   independent random `firstName`/`lastName` payload.
3. Create a Book through `POST /books` (via `booksApiSteps.createBook()`), using
   `getRandomBookOverridePayload({ authors: [authorA.id] })` with a unique title fragment
   (`getRandomUniqueFragment()`) so the title is deterministically findable in the UI and does not
   collide with the live catalog's fixed 29 seed books.

# Verify Setup (API)
1. `GET /books/{id}` for the created book and assert `authors` contains exactly one entry, whose
   `id`/`firstName`/`lastName` match Author A.
2. Assert the response status is `200` and the body matches the `Book` contract (already enforced
   by `booksApiSteps.getBookById()`, which parses against `BookSchema`).

# Action (UI)
1. Navigate to the "Manage Books" view (`/books-management`).
2. Locate the created book's row by its unique title (use the search box, or scroll/filter — the
   management table is not paginated).
3. Click the row's edit (✏️) action to open the "Edit Book" modal.
4. In the "Authors * (select at least one)" checklist, confirm Author A's checkbox is pre-checked,
   then check Author B's checkbox (leaving Author A checked) — this expands the book from one
   author to two, it does not replace the association.
5. Click "Update Book" to submit.

# Verify UI
1. The "Edit Book" modal closes with no error state shown.
2. The book's row in the Books Management table now lists both authors in the "Authors" column, in
   the form `"<Author A firstName> <Author A lastName>, <Author B firstName> <Author B lastName>"`
   (order as returned by the API is not guaranteed — assert both author names are present rather
   than an exact string when order is not deterministic).
3. Navigate to the public catalog (Home, `/`) and confirm the same book card now displays both
   author names in its byline paragraph.

# Verify API
1. `GET /books/{id}` for the same book and assert:
   - status is `200`.
   - `authors` has length `2`.
   - `authors` contains both Author A and Author B (`{ id, firstName, lastName }` for each),
     asserted with `expect.arrayContaining([...])` since order is not guaranteed.
   - `title`, `year`, `price`, `available` are unchanged from Setup (the PUT payload must echo the
     book's existing scalar fields, since `PUT /books/{id}` performs a full replace, not a partial
     patch — the live API also requires `title`, `year`, `price`, `available`, and `authors` to be
     re-submitted together).

# Cleanup (API)
1. Delete the book through `DELETE /books/{id}` (`booksApiSteps.deleteBook()`).
2. Delete Author A through `DELETE /authors/{id}` (`authorsApiSteps.deleteAuthor()`).
3. Delete Author B through `DELETE /authors/{id}` (`authorsApiSteps.deleteAuthor()`).

Cleanup order is mandatory: the book must be deleted before its referenced authors — deleting an
author still referenced by a book returns `409 Conflict` (confirmed live and already documented in
`tests/api/books/books-post-positive.spec.ts` / `books-id-put-positive.spec.ts`).

# Required API Endpoints
- `POST /authors` — create Author A and Author B.
- `POST /books` — create the book, initially with a single author.
- `GET /books/{id}` — verify setup and verify the final two-author state.
- `PUT /books/{id}` — issued by the UI itself when "Update Book" is submitted (not called directly
  by the test, but must be observed/asserted as the underlying network call if the test inspects
  it).
- `DELETE /books/{id}` — cleanup.
- `DELETE /authors/{id}` — cleanup (×2).

# Required API Coverage
All required coverage already exists — no BLOCKER:
- `tests/api/authors/authors-post-positive.spec.ts` — `POST /authors` positive coverage.
- `tests/api/authors/authors-id-delete-positive.spec.ts` — `DELETE /authors/{id}` positive coverage.
- `tests/api/books/books-post-positive.spec.ts` — `POST /books` positive coverage, including
  multi-author association (`POS-BOOKS-POST-002`).
- `tests/api/books/books-get-positive.spec.ts` / `tests/api/books/books-id-...` — `GET /books/{id}`
  coverage (used implicitly by `booksApiSteps.getBookById()`).
- `tests/api/books/books-id-put-positive.spec.ts` — `PUT /books/{id}` positive coverage, including
  the exact underlying transition this scenario exercises: "should expand a book from a single
  author to multiple unique authors" (`POS-BOOKS-PUT-003`) and "should persist all updated fields
  including a changed authors association on GET" (`POS-BOOKS-PUT-010`).
- `tests/api/books/books-id-delete-positive.spec.ts` — `DELETE /books/{id}` positive coverage.

# Required API Architecture
All required architecture already exists — no BLOCKER:
- `src/api/requests/author/author.api.request.ts` (`AuthorsAPIRequest`)
- `src/api/steps/author/author.api.steps.ts` (`AuthorsAPISteps`)
- `src/api/requests/book/book.api.request.ts` (`BooksAPIRequest`)
- `src/api/steps/book/book.api.steps.ts` (`BooksAPISteps`)
- `src/api/factories/author.factory.ts` (`getRandomAuthorPayload`)
- `src/api/factories/book.factory.ts` (`getRandomBookOverridePayload`)
- `src/api/models/author.model.ts`, `src/api/models/book.model.ts` (zod contracts)
- Fixtures wiring these steps into tests: `src/fixtures/api.fixture.ts`, `src/fixtures/test.fixture.ts`

# Required UI Components
None of the following exist yet in `src/ui/**` and must be created by `e2e-test-writer` (or a
preceding UI-architecture task) before this scenario can be automated — this is a planning note,
not a BLOCKER, since the required API layer this scenario also depends on is already complete:
- A `BooksManagementPage` Page Object (`src/ui/pages/books-management.page.ts`) for the
  `/books-management` route, exposing: the search input, the "Add New Book" button, the books
  table, and a way to resolve a table row by title.
- An `EditBookFormComponent` / modal component (`src/ui/components/edit-book-form.component.ts`)
  wrapping the "Edit Book" modal: title/year/price/available fields, the scrollable authors
  checkbox list (locate each author checkbox by its visible label, e.g.
  `getByRole('checkbox').and(getByLabel(authorFullName))` or a `getByText` scoped lookup — the
  checklist has no distinguishing `data-testid`s observed live), and the Cancel/Update Book buttons.
- Route constant: add `booksManagement: '/books-management'` to `src/data/routes.const.ts`
  (currently only `home` and `authors` are defined).
- Reuse `BookGridComponent` / `BookCardComponent` (existing) for the public-catalog UI verification
  step — `BookCardComponent.author(name)` already does an exact-text match against the byline
  paragraph, which the E2E test can query for each author's full name individually.

# Test Data
- Author A: `{ firstName: <faker>, lastName: <faker> }` via `getRandomAuthorPayload()`.
- Author B: `{ firstName: <faker>, lastName: <faker> }` via `getRandomAuthorPayload()` (independent
  call — must not collide with Author A).
- Book: `getRandomBookOverridePayload({ title: `E2E Add Author ${getRandomUniqueFragment()}`,
  authors: [authorA.id], year: 2010, price: 19.99, available: 5 })`.
  - `year` must be `>= 1900` (live API rejects lower years despite no documented minimum — see
    `books.factory.ts` and the CONTRACT-GAP notes in `books-post-positive.spec.ts`).
  - `title` must be present and unique (live API requires `title` despite the OpenAPI schema
    marking it optional, and enforces uniqueness with `409 Conflict` on duplicates).

# Assertions
- Setup: `POST /authors` ×2 → `201`, response matches `Author` contract, `firstName`/`lastName`
  echo the submitted payload.
- Setup: `POST /books` → `201`, response matches `Book` contract, `authors` contains exactly
  Author A.
- Verify Setup: `GET /books/{id}` → `200`, `authors.length === 1`, `authors[0].id === authorA.id`.
- Action (UI): Author A's checkbox is pre-checked when the modal opens; after checking Author B and
  clicking "Update Book", the modal closes without an error message.
- Verify UI: the Books Management table row for the book displays both author names; the public
  catalog book card for the same title displays both author names.
- Verify API: `GET /books/{id}` → `200`; `authors.length === 2`;
  `authors` array-contains both `{ id: authorA.id, firstName: authorA.firstName, lastName:
  authorA.lastName }` and `{ id: authorB.id, firstName: authorB.firstName, lastName:
  authorB.lastName }`; `title`, `year`, `price`, `available` unchanged from Setup.
- Cleanup: `DELETE /books/{id}` → `204`; `DELETE /authors/{id}` ×2 → `204`.

# Notes
- **Live-validated via Playwright MCP** against `https://ksiegarnia.up.railway.app/` on 2026-08-19,
  using disposable API-created test data (book id 31, author ids 47/48 — all deleted at the end of
  the validation session). The "Edit Book" modal on `/books-management` supports adding a second
  author to an existing book: the authors section is a checkbox list of all authors, with the
  book's current author(s) pre-checked; checking an additional author and clicking "Update Book"
  issues `PUT /books/{id}` with the full `authors` id array (both ids), and the API responds `200`
  with both authors resolved in the body. This was confirmed end-to-end, including that the table
  row and the public catalog page both re-render with both author names after the update.
- **Flake observation during live validation (documented, not blocking):** on the first attempt,
  clicking directly on the checkbox input element did not toggle its checked state or get included
  in the submitted payload (the PUT body only contained Author A even though the modal appeared to
  have had the second checkbox clicked). Clicking the label wrapper around the checkbox (rather
  than the bare `<input>`) — and explicitly re-snapshotting to confirm `checked` state before
  submitting — worked reliably on the second attempt. The `EditBookFormComponent` to be built should
  therefore click on the label/row wrapper for each author checkbox (matching the project's existing
  `add-author-form.component.ts` interaction patterns) rather than the raw checkbox input, and the
  E2E test should assert the checkbox is checked (`toBeChecked()`) before submitting, to avoid this
  class of flake.
- Author name validation deviation (discovered live, useful context for factory reuse): the live API
  rejects `firstName` values containing digits with `400 "firstName incorrect input data"` — this
  reinforces why `getRandomAuthorPayload()` must keep using letter-only faker name generators rather
  than any digit-suffixed uniqueness strategy (unlike book titles, which do append a random
  alphanumeric suffix).
- The Books Management table has no pagination/virtualization observed for the current 29-book
  catalog; for a freshly created book the row is appended and locatable by title without additional
  scrolling logic, but the future `BooksManagementPage` Page Object should still resolve rows by
  title via a row-level locator (e.g. `page.getByRole('row', { name: title })`) rather than by
  fixed index, consistent with `BookGridComponent.cardByTitle()`'s existing pattern.
- `PUT /books/{id}` is unauthenticated on the live API (no `Authorization` header required or
  checked) — consistent with `POS-BOOKS-PUT-012` in the existing API suite — so no login/auth setup
  step is required for this E2E scenario. The Home page navbar's "Login" button was observed but is
  out of scope here.
