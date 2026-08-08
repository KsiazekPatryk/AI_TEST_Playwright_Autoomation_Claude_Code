import { test, expect } from '@fixtures/test.fixture';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import {
  HTTP_204_NO_CONTENT,
  HTTP_400_BAD_REQUEST,
  HTTP_405_METHOD_NOT_ALLOWED,
  HTTP_409_CONFLICT,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from '@api/consts/http.status.codes.const';
import {
  NOT_SUPPORTED_MESSAGE_FRAGMENT,
  OPERATION_NOT_PERFORMED_MESSAGE,
  invalidPathVariableMessage,
} from '@api/consts/api.error.messages.const';
import { DECIMAL_ID, INVALID_BEARER_TOKEN, NON_NUMERIC_ID } from '@data/negative.inputs.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';

// The OpenAPI spec documents only a 204 response for DELETE /authors/{id} - no error responses are
// declared. Every case below was probed directly against the live API and asserts the exact
// observed status code and error message rather than a status range.

test.describe(
  'DELETE /authors/{id} - negative and robustness scenarios',
  { tag: ['@api', '@authors', '@regression'] },
  () => {
    const createdAuthorIds: number[] = [];
    const createdBookIds: number[] = [];

    test.afterEach(async ({ authorsApiSteps, booksApiSteps }) => {
      // Books first: an author that is still referenced by a book cannot be deleted (409).
      for (const bookId of createdBookIds.splice(0, createdBookIds.length)) {
        await booksApiSteps.deleteBook(bookId);
      }
      for (const authorId of createdAuthorIds.splice(0, createdAuthorIds.length)) {
        await authorsApiSteps.deleteAuthor(authorId);
      }
    });

    test('should silently no-op when deleting a non-existent id (NEG-AUTHORS-DELETE-001)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      const baseline = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(baseline.id);

      // The absent id is created and then deleted rather than hardcoded, so "does not exist" is a
      // guaranteed precondition instead of an assumption about the environment's data.
      const deleted = await authorsApiSteps.createAuthor();
      await authorsApiSteps.deleteAuthor(deleted.id);

      // Contract gap: the endpoint silently no-ops for an unknown id, returning 204 rather than 404.
      const deleteResponse = await authorsApiRequest.deleteAuthor(deleted.id);
      expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
      expect(await deleteResponse.body()).toHaveLength(0);

      const baselineStillExists = await authorsApiSteps.getAuthorById(baseline.id);
      expect(baselineStillExists, 'an unknown-id deletion must not touch unrelated authors').toEqual(baseline);
    });

    const noopDeleteIds = [
      { description: 'a negative id (-1)', id: -1, caseId: 'NEG-AUTHORS-DELETE-003' },
      { description: 'a zero id (0)', id: 0, caseId: 'NEG-AUTHORS-DELETE-004' },
    ];

    noopDeleteIds.forEach(({ description, id, caseId }) => {
      test(`should silently no-op when deleting ${description} (${caseId})`, async ({
        authorsApiSteps,
        authorsApiRequest,
      }) => {
        const baseline = await authorsApiSteps.createAuthor();
        createdAuthorIds.push(baseline.id);

        // Contract gap: a negative/zero id is a valid int64, so it is treated as just another
        // unknown id and no-ops with 204 rather than being rejected as out of range.
        const deleteResponse = await authorsApiRequest.deleteAuthor(id);

        expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
        expect(await deleteResponse.body()).toHaveLength(0);

        const baselineStillExists = await authorsApiSteps.getAuthorById(baseline.id);
        expect(baselineStillExists, 'an out-of-range id must not delete anything').toEqual(baseline);
      });
    });

    const malformedIdDeletes = [
      { description: 'a non-numeric id (abc)', id: NON_NUMERIC_ID, caseId: 'NEG-AUTHORS-DELETE-002' },
      { description: 'a decimal id (1.5)', id: DECIMAL_ID, caseId: 'NEG-AUTHORS-DELETE-005' },
    ];

    malformedIdDeletes.forEach(({ description, id, caseId }) => {
      test(`should reject a deletion with ${description} (${caseId})`, async ({ authorsApiRequest }) => {
        const deleteResponse = await authorsApiRequest.deleteAuthor(id);

        expect(deleteResponse.status()).toBe(HTTP_400_BAD_REQUEST);
        const error = await parseApiError(deleteResponse);
        expect(getApiErrorMessages(error)).toContain(invalidPathVariableMessage(id));
      });
    });

    test('should be idempotent on repeated deletion of the same id (NEG-AUTHORS-DELETE-006)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      const created = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(created.id);

      const firstDelete = await authorsApiRequest.deleteAuthor(created.id);
      expect(firstDelete.status()).toBe(HTTP_204_NO_CONTENT);

      // Contract gap: a second deletion of the same, now-absent id also returns 204 rather than 404.
      const secondDelete = await authorsApiRequest.deleteAuthor(created.id);
      expect(secondDelete.status(), 'repeated deletion must be idempotent').toBe(HTTP_204_NO_CONTENT);
      expect(await secondDelete.body()).toHaveLength(0);
    });

    test('should block deleting an author referenced by a book with a conflict (NEG-AUTHORS-DELETE-007)', async ({
      authorsApiSteps,
      authorsApiRequest,
      booksApiSteps,
    }) => {
      const author = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(author.id);

      const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
      createdBookIds.push(book.id);

      // Contract gap: referential integrity is enforced with a 409 - the deletion neither cascades
      // to the book nor orphans its author reference - but no error response is documented.
      const deleteResponse = await authorsApiRequest.deleteAuthor(author.id);
      expect(deleteResponse.status()).toBe(HTTP_409_CONFLICT);

      const error = await parseApiError(deleteResponse);
      expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

      const refreshedBook = await booksApiSteps.getBookById(book.id);
      const stillReferenced = refreshedBook.authors.find((bookAuthor) => bookAuthor.id === author.id);
      expect(stillReferenced, 'the blocked deletion must leave the book reference intact').toBeDefined();
    });

    test('should not bulk-delete authors via DELETE on the collection path (NEG-AUTHORS-DELETE-008)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      const baseline = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(baseline.id);

      const deleteResponse = await authorsApiRequest.deleteAuthorsCollection();

      expect(deleteResponse.status(), 'DELETE is not supported on the collection path').toBe(
        HTTP_405_METHOD_NOT_ALLOWED,
      );
      const error = await parseApiError(deleteResponse);
      expect(getApiErrorMessages(error).join(' ')).toContain(NOT_SUPPORTED_MESSAGE_FRAGMENT);

      const baselineStillExists = await authorsApiSteps.getAuthorById(baseline.id);
      expect(baselineStillExists, 'no author may be removed by the rejected bulk delete').toEqual(baseline);
    });

    test('should not fail with a server error when an invalid bearer token is supplied (NEG-AUTHORS-DELETE-009)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      // KNOWN DEFECT (expected failure): the endpoint declares no security scheme, so an
      // unparseable credential must either be ignored (204) or rejected cleanly (401). The live
      // API instead returns 500 {"message":"Invalid token"} on every /authors verb - the same
      // defect already recorded for GET in NEG-AUTHORS-GET-006. Marked with test.fail() so the
      // defect stays visible and this test turns red the moment the API is fixed.
      test.fail();

      const created = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(created.id);

      const deleteResponse = await authorsApiRequest.deleteAuthor(created.id, {
        Authorization: INVALID_BEARER_TOKEN,
      });

      expect(deleteResponse.status(), 'an invalid token must not crash a public endpoint').toBeLessThan(
        HTTP_500_INTERNAL_SERVER_ERROR,
      );
    });
  },
);
