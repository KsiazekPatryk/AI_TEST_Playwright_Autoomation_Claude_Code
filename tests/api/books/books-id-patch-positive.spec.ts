import { test, expect } from '@fixtures/test.fixture';
import type { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

const API_URL = process.env.API_URL ?? 'https://bookstoreapi.up.railway.app';

// The PATCH /books/{id} request body is documented only as a generic
// `type: object, additionalProperties: { type: object }` map (operationId `partialUpdateBook`) -
// no named schema, and the 200 response is a bare `type: object`. `title`/`year`/`price`/
// `available`/`authors` are treated as the realistic patchable fields, borrowed from the sibling
// `Book`/`UpdateBookPayload` schemas, and every assertion below verifies persisted state via a
// follow-up GET /books/{id} rather than trusting the PATCH response shape.
//
// Live probing (see NEG-BOOKS-PATCH-011/012 in the negative spec) found that PATCH enforces a
// `price` maximum of 1000 - matching `CreateBookPayload.maximum`, not the `10000` documented on
// `UpdateBookPayload` (used by PUT) - while its `price` minimum (1) and `available` bounds
// (1-10000) do match `UpdateBookPayload`. POS-BOOKS-PATCH-009 below asserts the boundary that is
// actually enforced (1000), which is itself the contract-gap finding.
//
// Live probing also confirmed that patching `authors` fully replaces the association array rather
// than merging/appending (POS-BOOKS-PATCH-005).

const AuthorSchema = z.object({
  id: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
});

const BookSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  year: z.number().int(),
  price: z.number(),
  coverId: z.number().int().nullable(),
  available: z.number().int(),
  authors: z.array(AuthorSchema),
});

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

test.describe('PATCH /books/{id} - positive scenarios', { tag: ['@api', '@books', '@smoke'] }, () => {
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

  test('should partially update only title, leaving other fields unchanged (POS-BOOKS-PATCH-001)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, {
      data: { title: 'PatchedTitle' },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(patchResponse.status()).toBe(200);
    expect(patchResponse.headers()['content-type']).toContain('application/json');

    const book = await getBook(request, original.id);
    const result = BookSchema.safeParse(book);
    expect(result.success, `GET /books/{id} response violates the Book contract: ${JSON.stringify(result.error?.issues)}`).toBe(
      true,
    );

    expect(book.title).toBe('PatchedTitle');
    expect(book.year).toBe(original.year);
    expect(book.price).toBe(original.price);
    expect(book.available).toBe(original.available);
    expect(book.authors.map((a) => a.id)).toEqual([author.id]);
  });

  test('should partially update only year, leaving other fields unchanged (POS-BOOKS-PATCH-002)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { year: 1999 } });
    expect(patchResponse.status()).toBe(200);

    const book = await getBook(request, original.id);
    expect(book.year).toBe(1999);
    expect(book.title).toBe(original.title);
    expect(book.price).toBe(original.price);
    expect(book.available).toBe(original.available);
    expect(book.authors.map((a) => a.id)).toEqual([author.id]);
  });

  test('should partially update only price with a mid-range value (POS-BOOKS-PATCH-003)', async ({ request }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { price: 15.5 } });
    expect(patchResponse.status()).toBe(200);

    const book = await getBook(request, original.id);
    expect(book.price).toBe(15.5);
    expect(book.title).toBe(original.title);
    expect(book.year).toBe(original.year);
    expect(book.available).toBe(original.available);
  });

  test('should partially update only available with a mid-range value (POS-BOOKS-PATCH-004)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { available: 10 } });
    expect(patchResponse.status()).toBe(200);

    const book = await getBook(request, original.id);
    expect(book.available).toBe(10);
    expect(book.title).toBe(original.title);
    expect(book.year).toBe(original.year);
    expect(book.price).toBe(original.price);
  });

  test('should fully replace authors on reassignment rather than merging (POS-BOOKS-PATCH-005)', async ({
    request,
  }) => {
    const authorA = await createAuthor(request);
    const authorB = await createAuthor(request);
    createdAuthorIds.push(authorA.id, authorB.id);
    const original = await createBook(request, [authorA.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, {
      data: { authors: [authorB.id] },
    });
    expect(patchResponse.status()).toBe(200);

    const book = await getBook(request, original.id);
    // Confirmed by live probing: the authors array is fully replaced, not merged/appended - author
    // A is no longer present once author B is patched in.
    expect(book.authors.map((a) => a.id)).toEqual([authorB.id]);
    expect(book.title).toBe(original.title);
    expect(book.year).toBe(original.year);
    expect(book.price).toBe(original.price);
    expect(book.available).toBe(original.available);
  });

  test('should update multiple fields atomically while leaving year unchanged (POS-BOOKS-PATCH-006)', async ({
    request,
  }) => {
    const authorA = await createAuthor(request);
    const authorB = await createAuthor(request);
    createdAuthorIds.push(authorA.id, authorB.id);
    const original = await createBook(request, [authorA.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, {
      data: { title: 'MultiPatchedTitle', price: 22.0, available: 30, authors: [authorA.id, authorB.id] },
    });
    expect(patchResponse.status()).toBe(200);

    const book = await getBook(request, original.id);
    expect(book.title).toBe('MultiPatchedTitle');
    expect(book.price).toBe(22);
    expect(book.available).toBe(30);
    expect(book.authors.map((a) => a.id).sort()).toEqual([authorA.id, authorB.id].sort());
    expect(book.year, 'year was omitted from the payload and must be unaffected').toBe(original.year);
  });

  test('should accept an empty body as a no-op and leave the book unchanged (POS-BOOKS-PATCH-007)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: {} });
    expect(patchResponse.status(), 'an empty partial update is contract-valid since no field is required').toBe(200);

    const book = await getBook(request, original.id);
    expect(book).toEqual(original);
  });

  test('should converge to the same state after repeated identical patches (POS-BOOKS-PATCH-008)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const payload = { title: 'IdempotentTitle' };

    const firstPatch = await request.patch(`${API_URL}/books/${original.id}`, { data: payload });
    expect(firstPatch.status()).toBe(200);

    const secondPatch = await request.patch(`${API_URL}/books/${original.id}`, { data: payload });
    expect(secondPatch.status(), 'repeated identical patches must both succeed').toBe(200);

    const book = await getBook(request, original.id);
    expect(book.title).toBe('IdempotentTitle');
  });

  test('should accept price at the boundaries actually enforced by PATCH (POS-BOOKS-PATCH-009)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const minResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { price: 1 } });
    expect(minResponse.status()).toBe(200);
    expect((await getBook(request, original.id)).price).toBe(1);

    // UpdateBookPayload (used by PUT /books/{id}) documents price maximum as 10000, but live
    // probing of this PATCH endpoint found it actually enforces a maximum of 1000 (matching
    // CreateBookPayload.maximum instead) - price: 10000 is rejected with 400 "price incorrect
    // input data" (see NEG-BOOKS-PATCH-012 in the negative spec). This is a cross-endpoint
    // contract-gap finding: the two operations mutate the same Book resource but enforce different
    // price ceilings.
    const maxResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { price: 1000 } });
    expect(maxResponse.status()).toBe(200);
    expect((await getBook(request, original.id)).price).toBe(1000);
  });

  test('should accept available at its documented boundaries, 1 and 10000 (POS-BOOKS-PATCH-010)', async ({
    request,
  }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    const minResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { available: 1 } });
    expect(minResponse.status()).toBe(200);
    expect((await getBook(request, original.id)).available).toBe(1);

    const maxResponse = await request.patch(`${API_URL}/books/${original.id}`, { data: { available: 10000 } });
    expect(maxResponse.status()).toBe(200);
    expect((await getBook(request, original.id)).available).toBe(10000);
  });

  test('should update a book without an Authorization header (POS-BOOKS-PATCH-011)', async ({ request }) => {
    const author = await createAuthor(request);
    createdAuthorIds.push(author.id);
    const original = await createBook(request, [author.id]);
    createdBookIds.push(original.id);

    // The spec declares no securitySchemes for this endpoint, so no Authorization header is sent.
    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, {
      data: { title: 'NoAuthPatch' },
    });

    expect(patchResponse.status(), 'PATCH /books/{id} is unauthenticated').toBe(200);
    expect(patchResponse.headers()['content-type']).toContain('application/json');

    const book = await getBook(request, original.id);
    expect(book.title).toBe('NoAuthPatch');
  });

  test('should reflect a patched title and reassigned author in GET /books filters (POS-BOOKS-PATCH-012)', async ({
    request,
  }) => {
    const authorA = await createAuthor(request);
    const authorB = await createAuthor(request);
    createdAuthorIds.push(authorA.id, authorB.id);
    const original = await createBook(request, [authorA.id]);
    createdBookIds.push(original.id);

    const patchResponse = await request.patch(`${API_URL}/books/${original.id}`, {
      data: { title: 'ConsistencyCheckTitle', authors: [authorB.id] },
    });
    expect(patchResponse.status()).toBe(200);

    const byTitleResponse = await request.get(`${API_URL}/books`, { params: { title: 'ConsistencyCheckTitle' } });
    expect(byTitleResponse.status()).toBe(200);
    const byTitle: Array<{ id: number; title: string }> = await byTitleResponse.json();
    const titleMatch = byTitle.find((b) => b.id === original.id);
    expect(titleMatch, 'the patched book must be reachable through the updated title filter').toBeDefined();
    expect(titleMatch?.title).toBe('ConsistencyCheckTitle');

    const byAuthorResponse = await request.get(`${API_URL}/books`, { params: { author: authorB.firstName } });
    expect(byAuthorResponse.status()).toBe(200);
    const byAuthor: Array<{ id: number; authors: Array<{ firstName: string }> }> = await byAuthorResponse.json();
    const authorMatch = byAuthor.find((b) => b.id === original.id);
    expect(
      authorMatch,
      'the patched book must be reachable through the reassigned author filter',
    ).toBeDefined();
    expect(authorMatch?.authors.some((a) => a.firstName === authorB.firstName)).toBe(true);
  });
});
