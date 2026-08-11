import { test, expect } from '@fixtures/test.fixture';
import type { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

const API_URL = process.env.API_URL ?? 'https://bookstoreapi.up.railway.app';

// The OpenAPI spec documents only a 200 response for PATCH /books/{id} (operationId
// `partialUpdateBook`) - no 400/401/403/404/409/500 responses are declared, and the request body
// schema is a generic `type: object, additionalProperties: { type: object }` map with no named
// properties. Every case below was probed directly against the live API and asserts the exact
// observed status code and, where stable, the exact error message - rather than a loose "not 200"
// range - so a regression (e.g. 400 silently becoming 200, or a validation error turning into a
// 500 crash) is caught instead of passing unnoticed. Findings that diverge from the sibling PUT
// contract or from a graceful-failure expectation are called out inline as contract-gap/defect
// comments.

interface Author {
  id: number;
  firstName: string;
  lastName: string;
}

interface Book {
  id: number;
  title: string;
  year: number;
  price: number;
  coverId: number | null;
  available: number;
  authors: Author[];
}

// The live API rejects author names containing non-letter characters (e.g. Faker's "O'Kon") and
// names shorter than 3 letters (e.g. "Wm", "Al") with a 400 "incorrect input data" - normalizing
// keeps author setup deterministic across runs regardless of which name Faker generates.
function sanitizeName(name: string): string {
  const lettersOnly = name.replace(/[^a-zA-Z]/g, '');
  return lettersOnly.length >= 3 ? lettersOnly : lettersOnly.padEnd(3, 'x');
}

async function createAuthor(request: APIRequestContext): Promise<Author> {
  const payload = {
    firstName: sanitizeName(faker.person.firstName()),
    lastName: sanitizeName(faker.person.lastName()),
  };
  const response = await request.post(`${API_URL}/authors`, { data: payload });
  expect(response.status(), 'author setup must succeed').toBe(201);
  return response.json();
}

async function createBook(request: APIRequestContext, authorIds: number[]): Promise<Book> {
  const payload = {
    // The API enforces a unique constraint on title (409 on a duplicate) - faker.book.title() draws
    // from a small fixed pool, so a random suffix keeps concurrent test runs collision-free.
    title: `${faker.book.title()} ${faker.string.uuid()}`,
    year: faker.number.int({ min: 1900, max: 2023 }),
    price: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
    available: faker.number.int({ min: 1, max: 100 }),
    authors: authorIds,
  };
  const response = await request.post(`${API_URL}/books`, { data: payload });
  expect(response.status(), 'book setup must succeed').toBe(201);
  return response.json();
}

async function getBook(request: APIRequestContext, id: number): Promise<Book> {
  const response = await request.get(`${API_URL}/books/${id}`);
  expect(response.status()).toBe(200);
  return response.json();
}

test.describe('PATCH /books/{id} - negative and robustness scenarios', { tag: ['@api', '@books', '@regression'] }, () => {
  const createdBookIds: number[] = [];
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ request }) => {
    // Books must be deleted before their authors, since the API rejects deleting an author that is
    // still referenced by a book (409 Conflict).
    for (const id of createdBookIds.splice(0, createdBookIds.length)) {
      await request.delete(`${API_URL}/books/${id}`);
    }
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await request.delete(`${API_URL}/authors/${id}`);
    }
  });

  test('should reject a non-numeric id path parameter (NEG-BOOKS-PATCH-001)', async ({ request }) => {
    const patchResponse = await request.patch(`${API_URL}/books/abc`, { data: { title: 'PatchedTitle' } });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('For input string: "abc"');
  });

  test('should reject a decimal id path parameter (NEG-BOOKS-PATCH-002)', async ({ request }) => {
    const patchResponse = await request.patch(`${API_URL}/books/1.5`, { data: { title: 'DecimalIdTitle' } });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('For input string: "1.5"');
  });

  test('should return 404 with an empty body when patching a non-existent book id (NEG-BOOKS-PATCH-003)', async ({
    request,
  }) => {
    // The absent id is created and then deleted rather than hardcoded, so "does not exist" is a
    // guaranteed precondition instead of an assumption about the environment's data.
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const created = await createBook(request, [author.id]);
    // Deleted immediately (not tracked in createdBookIds) so "does not exist" is a guaranteed
    // precondition instead of an assumption about the environment's data, without double-deleting.
    await request.delete(`${API_URL}/books/${created.id}`);

    const patchResponse = await request.patch(`${API_URL}/books/${created.id}`, { data: { title: 'GhostBook' } });

    // Contract gap: 404 is not documented for this operation, only 200.
    expect(patchResponse.status()).toBe(404);
    expect(await patchResponse.body(), 'the 404 is returned with an empty body').toHaveLength(0);
  });

  test('should reject malformed JSON syntax and leave the book unchanged (NEG-BOOKS-PATCH-004)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, {
      data: '{ "title": "Broken" ',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('operation could not be performed');

    const book = await getBook(request, original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should reject a non-object (array) request body and leave the book unchanged (NEG-BOOKS-PATCH-005)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, {
      data: ['title', 'PatchedTitle'],
    });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('operation could not be performed');

    const book = await getBook(request, original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should reject title sent as a number and leave the book unchanged (NEG-BOOKS-PATCH-006)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { title: 12345 } });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('title incorrect input data');

    const book = await getBook(request, original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should reject year sent as a non-numeric string and leave the book unchanged (NEG-BOOKS-PATCH-007)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { year: 'not-a-year' } });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('year incorrect input data');

    const book = await getBook(request, original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should silently coerce price sent as a numeric string (NEG-BOOKS-PATCH-008)', async ({ request }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    // Contract-gap finding: unlike title/year/available (rejected with 400 on a type mismatch),
    // the live API accepts price as a numeric string and silently coerces it to a number instead
    // of rejecting the request.
    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { price: '19.99' } });

    expect(patchResponse.status()).toBe(200);

    const book = await getBook(request, original.id);
    expect(book.price).toBe(19.99);
  });

  test('should reject available sent as a numeric string and leave the book unchanged (NEG-BOOKS-PATCH-009)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { available: '5' } });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('available incorrect input data');

    const book = await getBook(request, original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should not crash with a 500 when authors items are sent as strings instead of integers (NEG-BOOKS-PATCH-010)', async ({
    request,
  }) => {
    // KNOWN DEFECT (expected failure): the realistic authors item type is integer(int64), per the
    // sibling UpdateBookPayload/CreateBookPayload schemas. Sending string items does not return a
    // graceful 400 validation error - the live API throws an unhandled ClassCastException
    // ("class java.lang.String cannot be cast to class java.lang.Integer") and returns a raw 500
    // Internal Server Error. Marked with test.fail() so this stays visible and the test turns red
    // the moment the API is fixed.
    test.fail();

    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { authors: ['one'] } });

    expect(patchResponse.status(), 'a type-mismatched authors item must not crash the server').toBeLessThan(500);
  });

  test('should reject price below the realistic minimum of 1 (NEG-BOOKS-PATCH-011)', async ({ request }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    // Live probing confirms PATCH enforces the same price lower bound (minimum: 1) as
    // UpdateBookPayload, formally documented only for PUT /books/{id}.
    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { price: 0 } });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('price incorrect input data');

    const book = await getBook(request, original.id);
    expect(book.price, 'a rejected patch must not mutate the book').toBe(original.price);
  });

  test('should reject price above the realistic maximum enforced by PATCH (NEG-BOOKS-PATCH-012)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    // Cross-endpoint contract-gap finding: UpdateBookPayload (used by PUT) documents price maximum
    // as 10000, but live probing shows PATCH actually enforces a lower maximum of 1000 (matching
    // CreateBookPayload.maximum instead) - both 10000.01 (this payload) and values as low as 1001
    // are rejected. See POS-BOOKS-PATCH-009 in the positive spec for the accepted boundary.
    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { price: 10000.01 } });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('price incorrect input data');

    const book = await getBook(request, original.id);
    expect(book.price, 'a rejected patch must not mutate the book').toBe(original.price);
  });

  test('should reject available below the documented minimum of 1 (NEG-BOOKS-PATCH-013)', async ({ request }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    // Live probing confirms PATCH enforces the same available lower bound (minimum: 1) as
    // UpdateBookPayload, formally documented only for PUT /books/{id}.
    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { available: 0 } });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('available incorrect input data');

    const book = await getBook(request, original.id);
    expect(book.available, 'a rejected patch must not mutate the book').toBe(original.available);
  });

  test('should reject available above the documented maximum of 10000 (NEG-BOOKS-PATCH-014)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    // Live probing confirms PATCH enforces the same available upper bound (maximum: 10000) as
    // UpdateBookPayload, formally documented only for PUT /books/{id}.
    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { available: 10001 } });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('available incorrect input data');

    const book = await getBook(request, original.id);
    expect(book.available, 'a rejected patch must not mutate the book').toBe(original.available);
  });

  test('should silently de-duplicate an authors array containing duplicate ids (NEG-BOOKS-PATCH-015)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    // Contract-gap finding: uniqueItems: true is only documented on the sibling
    // UpdateBookPayload/CreateBookPayload.authors schemas, not on this generic PATCH body. Live
    // probing shows the API accepts the duplicate-id array with 200 and silently de-duplicates it
    // rather than rejecting the request.
    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, {
      data: { authors: [author.id, author.id] },
    });

    expect(patchResponse.status()).toBe(200);

    const book = await getBook(request, original.id);
    expect(book.authors.map((a) => a.id)).toEqual([author.id]);
  });

  test('should reject an authors array referencing a non-existent author id (NEG-BOOKS-PATCH-016)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    // High-value contract-gap finding: no schema/response documents referential-integrity
    // validation for this field on PATCH. Live probing shows the API does enforce it, rejecting the
    // update with a 400 and a descriptive message rather than persisting a dangling reference - on
    // parity with NEG-BOOKS-POST-009's finding for the same underlying relationship.
    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, {
      data: { authors: [999999999] },
    });

    expect(patchResponse.status()).toBe(400);
    const error = await patchResponse.json();
    expect(error.message).toContain('Can not find author with given id: 999999999');

    const book = await getBook(request, original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should not let a client override the server-generated id or coverId (NEG-BOOKS-PATCH-017)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    // coverId is documented as managed exclusively via the dedicated multipart
    // PATCH /books/{id}/cover operation. Live probing shows this generic PATCH rejects the payload
    // with a 400 (a server-side Integer/Long type mismatch on the coverId field), so neither id nor
    // coverId is overridden.
    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, {
      data: { id: 999, coverId: 1 },
    });

    expect(patchResponse.status()).toBeLessThan(500);

    const book = await getBook(request, original.id);
    expect(book.id, 'the server-generated id must not be overridable via this endpoint').toBe(original.id);
    expect(book.coverId, 'coverId must not be settable via this generic PATCH').toBe(original.coverId);
  });

  test('should reject a request with no Content-Type header (NEG-BOOKS-PATCH-018)', async ({ request }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    // The Content-Type header is omitted entirely rather than sent empty. Playwright then defaults
    // to application/octet-stream, which the API refuses with a 415.
    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, {
      data: '{"title":"NoContentTypeTitle"}',
    });

    expect(patchResponse.status()).toBe(415);
    const error = await patchResponse.json();
    expect(error.message).toContain('not supported');

    const book = await getBook(request, original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });
});
