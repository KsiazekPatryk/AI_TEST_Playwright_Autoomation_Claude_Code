import { test, expect } from '@fixtures/test.fixture';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import {
  HTTP_204_NO_CONTENT,
  HTTP_405_METHOD_NOT_ALLOWED,
  HTTP_409_CONFLICT,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from '@api/consts/http.status.codes.const';
import { parseResponse } from '@utils/parse.response.utils';

// The OpenAPI spec documents only a 204 response for DELETE /authors/{id} — no error responses
// (400, 404, 409, 500) are declared. These tests capture actual observed API behavior for
// undocumented/invalid input rather than asserting invented status codes. A 5xx response is always
// flagged as a robustness defect. The live API was probed directly with curl beforehand for every
// ambiguous case below, and assertions reflect the actually observed behavior.

test.describe(
  'DELETE /authors/{id} - negative and robustness scenarios',
  { tag: ['@api', '@authors', '@regression'] },
  () => {
    const createdAuthorIds: number[] = [];
    const createdBookIds: number[] = [];

    test.afterEach(async ({ authorsApiSteps, booksApiSteps }) => {
      for (const bookId of createdBookIds.splice(0, createdBookIds.length)) {
        await booksApiSteps.deleteBook(bookId);
      }
      for (const authorId of createdAuthorIds.splice(0, createdAuthorIds.length)) {
        await authorsApiSteps.deleteAuthor(authorId);
      }
    });

    test('should not crash the server when deleting a non-existent id (NEG-AUTHORS-DELETE-001)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      const baseline = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(baseline.id);

      const nonExistentId = 999999999;

      // Observed live behavior: the endpoint silently no-ops for a non-existent id, returning 204
      // rather than a 404. Recorded as a contract-gap finding, not a guessed/invented status code.
      const deleteResponse = await authorsApiRequest.deleteAuthor(nonExistentId);
      expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
      expect(deleteResponse.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

      const baselineStillExists = await authorsApiSteps.getAuthorById(baseline.id);
      expect(baselineStillExists.id).toBe(baseline.id);
    });

    const noopDeleteIds = [
      { description: 'a negative id (-1)', id: -1 },
      { description: 'a zero id (0)', id: 0 },
    ];

    noopDeleteIds.forEach(({ description, id }) => {
      test(`should not crash the server when deleting ${description} (NEG-AUTHORS-DELETE-003/004)`, async ({
        authorsApiRequest,
      }) => {
        // Observed live behavior: a negative/zero, non-existent id is treated the same as any
        // other non-existent id — the endpoint returns 204 rather than an error. Recorded as a
        // contract-gap finding based on the actual probed response, not an assumed status code.
        const deleteResponse = await authorsApiRequest.deleteAuthor(id);

        expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
        expect(deleteResponse.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
      });
    });

    const malformedIdDeletes = [
      { description: 'a non-numeric id (abc)', id: 'abc' },
      { description: 'a decimal id (1.5)', id: '1.5' },
    ];

    malformedIdDeletes.forEach(({ description, id }) => {
      test(`should reject a deletion with ${description} with a well-formed error (NEG-AUTHORS-DELETE-002/005)`, async ({
        authorsApiRequest,
      }) => {
        const deleteResponse = await authorsApiRequest.deleteAuthor(id);

        expect(deleteResponse.status()).not.toBe(HTTP_204_NO_CONTENT);
        expect(deleteResponse.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

        const body = await parseResponse<unknown>(deleteResponse);
        expect(typeof body).toBe('object');
        expect(body).not.toBeNull();
      });
    });

    test('should not crash the server on repeated deletion of the same id (NEG-AUTHORS-DELETE-006)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      const created = await authorsApiSteps.createAuthor();

      const firstDelete = await authorsApiRequest.deleteAuthor(created.id);
      expect(firstDelete.status()).toBe(HTTP_204_NO_CONTENT);

      // Observed live behavior: a second deletion of the same, now-absent id is idempotent and
      // also returns 204, rather than a 404. Recorded as a contract-gap finding, not an assumed
      // status code.
      const secondDelete = await authorsApiRequest.deleteAuthor(created.id);
      expect(secondDelete.status()).toBe(HTTP_204_NO_CONTENT);
      expect(secondDelete.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

      const baseline = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(baseline.id);
      const baselineStillExists = await authorsApiSteps.getAuthorById(baseline.id);
      expect(baselineStillExists.id).toBe(baseline.id);
    });

    test('should block deleting an author referenced by a book with a conflict (NEG-AUTHORS-DELETE-007)', async ({
      authorsApiSteps,
      authorsApiRequest,
      booksApiSteps,
      booksApiRequest,
    }) => {
      const author = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(author.id);

      const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
      createdBookIds.push(book.id);

      // Observed live behavior: deleting an author still referenced by a book is blocked with a
      // 409 Conflict, rather than being silently allowed or cascading. Recorded as a contract-gap
      // finding based on the actual probed response, not an assumed status code.
      const deleteResponse = await authorsApiRequest.deleteAuthor(author.id);
      expect(deleteResponse.status()).toBe(HTTP_409_CONFLICT);
      expect(deleteResponse.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

      const getBookResponse = await booksApiRequest.getBookById(book.id);
      const refreshedBook = await parseResponse<{ authors: Array<{ id: number }> }>(getBookResponse);
      const stillReferenced = refreshedBook.authors.find((bookAuthor) => bookAuthor.id === author.id);
      expect(stillReferenced).toBeDefined();
    });

    test('should not bulk-delete authors via DELETE on the collection path (NEG-AUTHORS-DELETE-008)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      const baseline = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(baseline.id);

      // Observed live behavior: DELETE is not a supported method on the collection path and
      // returns 405 Method Not Allowed, rather than performing a bulk deletion.
      const deleteResponse = await authorsApiRequest.deleteAuthorsCollection();
      expect(deleteResponse.status()).not.toBe(HTTP_204_NO_CONTENT);
      expect(deleteResponse.status()).toBe(HTTP_405_METHOD_NOT_ALLOWED);
      expect(deleteResponse.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

      const baselineStillExists = await authorsApiSteps.getAuthorById(baseline.id);
      expect(baselineStillExists.id).toBe(baseline.id);
    });
  },
);
