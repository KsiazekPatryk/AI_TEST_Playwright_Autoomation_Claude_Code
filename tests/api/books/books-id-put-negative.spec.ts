import { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { test, expect } from '@fixtures/test.fixture';
import { AuthorResponse } from '@api/models/author.model';
import { BookPayload, BookResponse } from '@api/models/book.model';
import {
  HTTP_200_OK,
  HTTP_201_CREATED,
  HTTP_204_NO_CONTENT,
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_415_UNSUPPORTED_MEDIA_TYPE,
} from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON, CONTENT_TYPE_TEXT_PLAIN } from '@api/consts/content.types.const';
import {
  NOT_SUPPORTED_MESSAGE_FRAGMENT,
  OPERATION_NOT_PERFORMED_MESSAGE,
  incorrectInputDataMessage,
  invalidPathVariableMessage,
} from '@api/consts/api.error.messages.const';
import { DECIMAL_ID, MALFORMED_JSON_BODY, NON_NUMERIC_ID } from '@data/negative.inputs.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';
import { parseResponse } from '@utils/parse.response.utils';
import { getRandomFirstName, getRandomLastName } from '@utils/random.data.utils';

const API_URL = 'https://bookstoreapi.up.railway.app';

// ARCHITECTURE NOTE: books tests have not been refactored into the 3-layer architecture used by the
// author specs (AuthorsAPIRequest / AuthorsAPISteps). This file matches the simple, raw-`request`
// style already used by tests/api/authors/authors-id-put-negative.spec.ts instead.

// The OpenAPI spec documents only a 200 response for PUT /books/{id} - no error responses are
// declared. Every case below was probed directly against the live API and asserts the exact
// observed status code and error message, rather than a "not 200 / below 500" range that would let
// a 400 -> 404/401 regression pass unnoticed - mirroring the rigour already applied to
// authors-id-put-negative.spec.ts.

// An author id guaranteed not to correspond to any existing author, for the referential-integrity
// probe (NEG-BOOKS-PUT-013).
const NON_EXISTENT_AUTHOR_ID = 999999999;

function randomAuthorPayload(): { firstName: string; lastName: string } {
  return { firstName: getRandomFirstName(), lastName: getRandomLastName() };
}

async function seedAuthor(request: APIRequestContext): Promise<AuthorResponse> {
  const response = await request.post(`${API_URL}/authors`, {
    headers: { 'Content-Type': CONTENT_TYPE_JSON },
    data: randomAuthorPayload(),
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

test.describe(
  'PUT /books/{id} - negative and robustness scenarios',
  { tag: ['@api', '@books', '@regression'] },
  () => {
    const createdAuthorIds: number[] = [];
    let createdBookId: number | undefined;
    let author: AuthorResponse;
    let book: BookResponse;

    test.beforeEach(async ({ request }) => {
      author = await seedAuthor(request);
      createdAuthorIds.push(author.id);

      book = await seedBook(request, [author.id]);
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

    test('should return 404 when updating a non-existent id (NEG-BOOKS-PUT-001)', async ({ request }) => {
      // The absent id is created and then deleted rather than hardcoded, so "does not exist" is a
      // guaranteed precondition instead of an assumption about the environment's data.
      const extraAuthor = await seedAuthor(request);
      createdAuthorIds.push(extraAuthor.id);
      const deletedBook = await seedBook(request, [extraAuthor.id]);
      const deleteResponse = await request.delete(`${API_URL}/books/${deletedBook.id}`);
      expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);

      const updateResponse = await request.put(`${API_URL}/books/${deletedBook.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Ghost Book', authors: [extraAuthor.id], year: 2000, price: 10.0, available: 5 } as BookPayload,
      });

      // Contract gap: 404 is not documented for this operation, only 200.
      expect(updateResponse.status()).toBe(HTTP_404_NOT_FOUND);
      expect(await updateResponse.body(), 'the 404 is returned with an empty body').toHaveLength(0);

      const getResponse = await request.get(`${API_URL}/books/${deletedBook.id}`);
      expect(getResponse.status(), 'a rejected update must not resurrect the book').toBe(HTTP_404_NOT_FOUND);
    });

    test('should reject an update using a non-numeric id (NEG-BOOKS-PUT-002)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/${NON_NUMERIC_ID}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Baseline Book', authors: [author.id], year: 2000, price: 10.0, available: 5 } as BookPayload,
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(invalidPathVariableMessage(NON_NUMERIC_ID));
    });

    test('should return 404 when updating using a negative id (NEG-BOOKS-PUT-003)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/-1`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Baseline Book', authors: [author.id], year: 2000, price: 10.0, available: 5 } as BookPayload,
      });

      // A negative id is a syntactically valid int64, so it is treated as "not found" rather than as
      // a malformed path variable - the same behavior as any other non-existent id.
      expect(updateResponse.status()).toBe(HTTP_404_NOT_FOUND);
      expect(await updateResponse.body()).toHaveLength(0);
    });

    test('should reject an update using a decimal id (NEG-BOOKS-PUT-004)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/${DECIMAL_ID}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Baseline Book', authors: [author.id], year: 2000, price: 10.0, available: 5 } as BookPayload,
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(invalidPathVariableMessage(DECIMAL_ID));
    });

    test('should reject a request with no body sent and leave the book unchanged (NEG-BOOKS-PUT-005)', async ({
      request,
    }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should reject malformed JSON syntax and leave the book unchanged (NEG-BOOKS-PUT-006)', async ({
      request,
    }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: MALFORMED_JSON_BODY,
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should reject a payload missing the required authors field (NEG-BOOKS-PUT-007)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Missing Authors', year: 2000, price: 10.0, available: 5 },
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('authors'));

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should reject a payload missing the required year field (NEG-BOOKS-PUT-008)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Missing Year', authors: [author.id], price: 10.0, available: 5 },
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('year'));

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should reject a payload missing the required price field (NEG-BOOKS-PUT-009)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Missing Price', authors: [author.id], year: 2000, available: 5 },
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('price'));

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should reject a payload missing the required available field (NEG-BOOKS-PUT-010)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Missing Available', authors: [author.id], year: 2000, price: 10.0 },
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should silently de-duplicate an authors array containing duplicate ids (NEG-BOOKS-PUT-011)', async ({
      request,
    }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: {
          title: 'Duplicate Authors',
          authors: [author.id, author.id],
          year: 2000,
          price: 10.0,
          available: 5,
        } as BookPayload,
      });

      // Contract gap: uniqueItems: true is violated by the input, but the live API accepts it and
      // silently de-duplicates rather than rejecting - recorded here rather than assumed.
      expect(updateResponse.status()).toBe(HTTP_200_OK);

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      const persisted = await parseResponse<BookResponse>(getResponse);
      expect(persisted.authors.map((a) => a.id), 'duplicate author ids are silently de-duplicated').toEqual([
        author.id,
      ]);
    });

    test('should reject an empty authors array (NEG-BOOKS-PUT-012)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Authorless Book', authors: [], year: 2000, price: 10.0, available: 5 } as BookPayload,
      });

      // Contract gap: no minItems is documented, but the live API rejects an authors-required book
      // with zero authors rather than accepting it.
      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('authors'));

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should reject an authors array referencing a non-existent author id (NEG-BOOKS-PUT-013)', async ({
      request,
    }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: {
          title: 'Ghost Author Book',
          authors: [NON_EXISTENT_AUTHOR_ID],
          year: 2000,
          price: 10.0,
          available: 5,
        } as BookPayload,
      });

      // High-value contract-gap finding: no referential-integrity validation is documented for
      // UpdateBookPayload.authors, but the live API does reject a dangling author reference outright
      // rather than persisting it or silently dropping the invalid id.
      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(`Can not find author with given id: ${NON_EXISTENT_AUTHOR_ID}`);

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should reject price below the documented minimum of 1 (NEG-BOOKS-PUT-014)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Too Cheap', authors: [author.id], year: 2000, price: 0, available: 5 } as BookPayload,
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('price'));

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should reject price above the documented maximum of 10000 (NEG-BOOKS-PUT-015)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Too Expensive', authors: [author.id], year: 2000, price: 10001, available: 5 } as BookPayload,
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('price'));

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should reject available below the documented minimum of 1 (NEG-BOOKS-PUT-016)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Zero Stock', authors: [author.id], year: 2000, price: 10.0, available: 0 } as BookPayload,
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should reject available above the documented maximum of 10000 (NEG-BOOKS-PUT-017)', async ({
      request,
    }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: {
          title: 'Overstocked',
          authors: [author.id],
          year: 2000,
          price: 10.0,
          available: 10001,
        } as BookPayload,
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should reject authors items sent as strings instead of integers (NEG-BOOKS-PUT-018)', async ({
      request,
    }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Wrong Author Type', authors: ['one'], year: 2000, price: 10.0, available: 5 },
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });

    test('should coerce price sent as a numeric string instead of a number (NEG-BOOKS-PUT-019)', async ({
      request,
    }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Wrong Price Type', authors: [author.id], year: 2000, price: '19.99', available: 5 },
      });

      // Contract gap: type: number is documented for price, but the live API coerces a numeric
      // string rather than rejecting the type mismatch.
      expect(updateResponse.status()).toBe(HTTP_200_OK);

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      const persisted = await parseResponse<BookResponse>(getResponse);
      expect(persisted.price, 'the numeric-string price is silently coerced to a number').toBe(19.99);
    });

    test('should coerce available sent as a numeric string instead of an integer (NEG-BOOKS-PUT-020)', async ({
      request,
    }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { title: 'Wrong Available Type', authors: [author.id], year: 2000, price: 10.0, available: '5' },
      });

      // Contract gap: type: integer is documented for available, but the live API coerces a
      // numeric string rather than rejecting the type mismatch.
      expect(updateResponse.status()).toBe(HTTP_200_OK);

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      const persisted = await parseResponse<BookResponse>(getResponse);
      expect(persisted.available, 'the numeric-string available is silently coerced to a number').toBe(5);
    });

    test('should ignore client-supplied id and coverId fields (NEG-BOOKS-PUT-021)', async ({ request }) => {
      const spoofedId = 999;

      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: {
          title: 'Spoofed Fields',
          authors: [author.id],
          year: 2000,
          price: 10.0,
          available: 5,
          id: spoofedId,
          coverId: 1,
        },
      });

      expect(updateResponse.status()).toBe(HTTP_200_OK);
      const updated = await parseResponse<BookResponse>(updateResponse);
      expect(updated.id, 'the path id must win over any client-supplied body id').toBe(book.id);

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      const persisted = await parseResponse<BookResponse>(getResponse);
      expect(persisted.id).toBe(book.id);
      expect(
        persisted.coverId,
        'a client-supplied coverId must not be accepted outside the documented cover upload flow',
      ).not.toBe(1);
    });

    test('should reject an unsupported Content-Type header (NEG-BOOKS-PUT-022)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/books/${book.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_TEXT_PLAIN },
        data: JSON.stringify({ title: 'Baseline Book', authors: [author.id], year: 2000, price: 10.0, available: 5 }),
      });

      expect(updateResponse.status()).toBe(HTTP_415_UNSUPPORTED_MEDIA_TYPE);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error).join(' ')).toContain(NOT_SUPPORTED_MESSAGE_FRAGMENT);

      const getResponse = await request.get(`${API_URL}/books/${book.id}`);
      expect(await parseResponse<BookResponse>(getResponse)).toEqual(book);
    });
  },
);
