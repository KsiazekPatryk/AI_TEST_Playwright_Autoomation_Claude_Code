import { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { test, expect } from '@fixtures/test.fixture';
import { AuthorResponse } from '@api/models/author.model';
import { BookPayload, BookResponse } from '@api/models/book.model';
import { HTTP_200_OK, HTTP_201_CREATED, HTTP_204_NO_CONTENT, HTTP_400_BAD_REQUEST } from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { incorrectInputDataMessage } from '@api/consts/api.error.messages.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';
import { parseResponse } from '@utils/parse.response.utils';
import { getRandomFirstName, getRandomLastName } from '@utils/random.data.utils';

const API_URL = 'https://bookstoreapi.up.railway.app';

// ARCHITECTURE NOTE: books tests have not been refactored into the 3-layer architecture used by the
// author specs (AuthorsAPIRequest / AuthorsAPISteps). This file matches the simple, raw-`request`
// style already used by tests/api/authors/authors-id-put-positive.spec.ts instead.

// CONTRACT DEVIATION (probed against the live API): UpdateBookPayload documents `year` with no
// minimum/maximum, but the running API rejects any year below 1900 with 400 "year incorrect input
// data". The scenario file's illustrative "Moby Dick" / "War and Peace" payloads (year 1851 / 1869)
// are therefore adjusted to a safe, in-range year (1990) below so the tests exercise the documented
// `authors` replace-semantics and boundary behavior rather than tripping this undocumented floor.

// CONTRACT DEVIATION (probed against the live API): UpdateBookPayload documents `title` as optional,
// but the running API rejects a PUT that omits it with 400 "title incorrect input data" - the same
// class of deviation already recorded for PUT /authors/{id} (see authors-id-put-positive.spec.ts).
// POS-BOOKS-PUT-005 below asserts that actual (rejecting) behavior.

// Book titles must be unique on the live API (a duplicate title returns 409), including across
// different book ids, so every payload title below gets a Faker-generated unique suffix - this
// keeps parallel test workers reusing the same descriptive title from colliding with each other.
function uniqueTitle(base: string): string {
  return `${base} ${faker.string.alphanumeric(8)}`;
}

async function seedAuthor(request: APIRequestContext): Promise<AuthorResponse> {
  const response = await request.post(`${API_URL}/authors`, {
    headers: { 'Content-Type': CONTENT_TYPE_JSON },
    data: { firstName: getRandomFirstName(), lastName: getRandomLastName() },
  });

  expect(response.status(), 'test setup must be able to seed an author').toBe(HTTP_201_CREATED);
  return parseResponse<AuthorResponse>(response);
}

async function seedBook(request: APIRequestContext, authorIds: number[]): Promise<BookResponse> {
  // Book titles must be unique on the live API (a duplicate title returns 409), so every seeded
  // book gets a Faker-generated unique suffix rather than a fixed literal - this also keeps
  // parallel workers from colliding on the same title.
  const payload: BookPayload = {
    title: `Baseline Book ${faker.string.uuid()}`,
    authors: authorIds,
    year: 2000,
    price: 10.0,
    available: 5,
  };

  const response = await request.post(`${API_URL}/books`, {
    headers: { 'Content-Type': CONTENT_TYPE_JSON },
    data: payload,
  });

  expect(response.status(), 'test setup must be able to seed a book').toBe(HTTP_201_CREATED);
  return parseResponse<BookResponse>(response);
}

test.describe('PUT /books/{id} - positive scenarios', { tag: ['@api', '@books', '@smoke'] }, () => {
  const createdAuthorIds: number[] = [];
  let createdBookId: number | undefined;
  let authorA: AuthorResponse;
  let authorB: AuthorResponse;
  let authorC: AuthorResponse;
  let book: BookResponse;

  test.beforeEach(async ({ request }) => {
    authorA = await seedAuthor(request);
    authorB = await seedAuthor(request);
    authorC = await seedAuthor(request);
    createdAuthorIds.push(authorA.id, authorB.id, authorC.id);

    book = await seedBook(request, [authorA.id]);
    createdBookId = book.id;
  });

  test.afterEach(async ({ request }) => {
    // Book deleted before its authors, so a still-referenced author is never left mid-cleanup.
    if (createdBookId !== undefined) {
      const response = await request.delete(`${API_URL}/books/${createdBookId}`);
      expect(response.status(), `cleanup failed for book ${createdBookId} - test data leaked`).toBe(
        HTTP_204_NO_CONTENT,
      );
      createdBookId = undefined;
    }

    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      const response = await request.delete(`${API_URL}/authors/${id}`);
      expect(response.status(), `cleanup failed for author ${id} - test data leaked`).toBe(HTTP_204_NO_CONTENT);
    }
  });

  test('should update an existing book with a fully populated valid payload (POS-BOOKS-PUT-001)', async ({
    request,
  }) => {
    const payload: BookPayload = {
      title: uniqueTitle('Moby Dick (Revised Edition)'),
      authors: [authorA.id],
      year: 1990,
      price: 24.99,
      available: 15,
    };

    const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });

    expect(updateResponse.status()).toBe(HTTP_200_OK);
    const updated = await parseResponse<BookResponse>(updateResponse);
    expect(typeof updated).toBe('object');
    expect(updated.id).toBe(book.id);

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    expect(getResponse.status()).toBe(HTTP_200_OK);
    const persisted = await parseResponse<BookResponse>(getResponse);
    expect(persisted).toMatchObject({
      id: book.id,
      title: payload.title,
      year: payload.year,
      price: payload.price,
      available: payload.available,
    });
  });

  test('should reassign a book from one author to a different author (POS-BOOKS-PUT-002)', async ({ request }) => {
    const payload: BookPayload = {
      title: uniqueTitle('Moby Dick (Revised Edition)'),
      authors: [authorB.id],
      year: 1990,
      price: 24.99,
      available: 15,
    };

    const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(updateResponse.status()).toBe(HTTP_200_OK);

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    const persisted = await parseResponse<BookResponse>(getResponse);
    const authorIds = persisted.authors.map((author) => author.id);

    expect(authorIds, 'the authors association must be replaced, not merged/appended').toEqual([authorB.id]);
    expect(authorIds).not.toContain(authorA.id);
  });

  test('should expand a book from a single author to multiple unique authors (POS-BOOKS-PUT-003)', async ({
    request,
  }) => {
    const payload: BookPayload = {
      title: uniqueTitle('Good Omens (Anniversary Edition)'),
      authors: [authorA.id, authorB.id],
      year: 1990,
      price: 19.5,
      available: 20,
    };

    const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(updateResponse.status()).toBe(HTTP_200_OK);

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    const persisted = await parseResponse<BookResponse>(getResponse);

    expect(persisted.authors).toEqual(
      expect.arrayContaining([
        { id: authorA.id, firstName: authorA.firstName, lastName: authorA.lastName },
        { id: authorB.id, firstName: authorB.firstName, lastName: authorB.lastName },
      ]),
    );
    expect(persisted.authors).toHaveLength(2);
  });

  test('should reduce a multi-author book back down to a single author (POS-BOOKS-PUT-004)', async ({ request }) => {
    // Self-contained: first expands to [A, B], then reduces to [A], rather than depending on
    // POS-BOOKS-PUT-003's execution order.
    const title = uniqueTitle('Good Omens (Anniversary Edition)');

    const expandResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: {
        title,
        authors: [authorA.id, authorB.id],
        year: 1990,
        price: 19.5,
        available: 20,
      } as BookPayload,
    });
    expect(expandResponse.status()).toBe(HTTP_200_OK);

    const reduceResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: {
        title,
        authors: [authorA.id],
        year: 1990,
        price: 19.5,
        available: 20,
      } as BookPayload,
    });
    expect(reduceResponse.status()).toBe(HTTP_200_OK);

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    const persisted = await parseResponse<BookResponse>(getResponse);
    const authorIds = persisted.authors.map((author) => author.id);

    expect(authorIds).toEqual([authorA.id]);
    expect(authorIds).not.toContain(authorB.id);
  });

  test('should reject an update omitting the optional title field despite the optional schema (POS-BOOKS-PUT-005)', async ({
    request,
  }) => {
    const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: { authors: [authorA.id], year: 2001, price: 12.99, available: 8 },
    });

    expect(updateResponse.status(), 'the live API requires title despite the optional schema').toBe(
      HTTP_400_BAD_REQUEST,
    );
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('title'));

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    expect(await parseResponse<BookResponse>(getResponse), 'a rejected update must not mutate the book').toEqual(
      book,
    );
  });

  test('should accept price at the documented minimum boundary of 1 (POS-BOOKS-PUT-006)', async ({ request }) => {
    const payload: BookPayload = {
      title: uniqueTitle('Penny Paperback'),
      authors: [authorA.id],
      year: 2010,
      price: 1,
      available: 5,
    };

    const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(updateResponse.status()).toBe(HTTP_200_OK);

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    const persisted = await parseResponse<BookResponse>(getResponse);
    expect(persisted.price).toBe(1);
  });

  test('should accept price at the documented maximum boundary of 10000 (POS-BOOKS-PUT-007)', async ({
    request,
  }) => {
    const payload: BookPayload = {
      title: uniqueTitle('Rare First Edition'),
      authors: [authorA.id],
      year: 1920,
      price: 10000,
      available: 1,
    };

    const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(updateResponse.status()).toBe(HTTP_200_OK);

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    const persisted = await parseResponse<BookResponse>(getResponse);
    expect(persisted.price).toBe(10000);
  });

  test('should accept available at the documented minimum boundary of 1 (POS-BOOKS-PUT-008)', async ({
    request,
  }) => {
    const payload: BookPayload = {
      title: uniqueTitle('Last Copy'),
      authors: [authorA.id],
      year: 2015,
      price: 12.0,
      available: 1,
    };

    const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(updateResponse.status()).toBe(HTTP_200_OK);

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    const persisted = await parseResponse<BookResponse>(getResponse);
    expect(persisted.available).toBe(1);
  });

  test('should accept available at the documented maximum boundary of 10000 (POS-BOOKS-PUT-009)', async ({
    request,
  }) => {
    const payload: BookPayload = {
      title: uniqueTitle('Mass Market Reprint'),
      authors: [authorA.id],
      year: 2020,
      price: 5.0,
      available: 10000,
    };

    const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(updateResponse.status()).toBe(HTTP_200_OK);

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    const persisted = await parseResponse<BookResponse>(getResponse);
    expect(persisted.available).toBe(10000);
  });

  test('should persist all updated fields including a changed authors association on GET (POS-BOOKS-PUT-010)', async ({
    request,
  }) => {
    const payload: BookPayload = {
      title: uniqueTitle('Data Consistency Test Book'),
      authors: [authorA.id, authorB.id],
      year: 1999,
      price: 39.99,
      available: 3,
    };

    const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(updateResponse.status()).toBe(HTTP_200_OK);

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    expect(getResponse.status()).toBe(HTTP_200_OK);
    const persisted = await parseResponse<BookResponse>(getResponse);

    expect(persisted).toMatchObject({
      id: book.id,
      title: payload.title,
      year: payload.year,
      price: payload.price,
      available: payload.available,
    });
    expect(persisted.authors.map((author) => author.id).sort()).toEqual([authorA.id, authorB.id].sort());
  });

  test('should be idempotent for repeated identical updates (POS-BOOKS-PUT-011)', async ({ request }) => {
    const payload: BookPayload = {
      title: uniqueTitle('War and Peace'),
      authors: [authorA.id],
      year: 1990,
      price: 29.99,
      available: 12,
    };

    const firstUpdate = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(firstUpdate.status()).toBe(HTTP_200_OK);

    const secondUpdate = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(secondUpdate.status()).toBe(HTTP_200_OK);

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    const persisted = await parseResponse<BookResponse>(getResponse);
    expect(persisted).toMatchObject({
      title: payload.title,
      year: payload.year,
      price: payload.price,
      available: payload.available,
    });
  });

  test('should update a book without an Authorization header (POS-BOOKS-PUT-012)', async ({ request }) => {
    const payload: BookPayload = {
      title: uniqueTitle('No Auth Book'),
      authors: [authorA.id],
      year: 2022,
      price: 14.99,
      available: 8,
    };

    // The spec declares no securitySchemes, so the endpoint must succeed with no credential at all.
    const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });

    expect(updateResponse.status(), 'PUT /books/{id} is unauthenticated - revisit if security is added').toBe(
      HTTP_200_OK,
    );
    const updated = await parseResponse<BookResponse>(updateResponse);
    expect(typeof updated).toBe('object');
  });
});
