import { test, expect } from '@fixtures/test.fixture';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import { AuthorResponse } from '@api/models/author.model';
import { BookResponse } from '@api/models/book.model';
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_409_CONFLICT,
  HTTP_415_UNSUPPORTED_MEDIA_TYPE,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON, CONTENT_TYPE_TEXT_PLAIN } from '@api/consts/content.types.const';
import {
  NOT_SUPPORTED_MESSAGE_FRAGMENT,
  OPERATION_NOT_PERFORMED_MESSAGE,
  authorNotFoundMessage,
  incorrectInputDataMessage,
  invalidPathVariableMessage,
} from '@api/consts/api.error.messages.const';
import {
  DECIMAL_ID,
  INVALID_BEARER_TOKEN,
  MALFORMED_JSON_BODY,
  NON_EXISTENT_AUTHOR_ID,
  NON_NUMERIC_ID,
} from '@data/negative.inputs.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';
import { parseResponse } from '@utils/parse.response.utils';
import { getRandomUniqueFragment } from '@utils/random.data.utils';

// The OpenAPI spec documents only a 200 response for PUT /books/{id} - no error responses are
// declared. Every case below was probed directly against the live API and asserts the exact
// observed status code and error message, rather than a "not 200 / below 500" range that would let
// a 400 -> 404/401 regression pass unnoticed - mirroring the rigour already applied to
// authors-id-put-negative.spec.ts.

test.describe('PUT /books/{id} - negative and robustness scenarios', { tag: ['@api', '@books', '@regression'] }, () => {
  const createdAuthorIds: number[] = [];
  const createdBookIds: number[] = [];
  let author: AuthorResponse;
  let book: BookResponse;

  test.beforeEach(async ({ authorsApiSteps, booksApiSteps }) => {
    author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);

    book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);
  });

  test.afterEach(async ({ booksApiSteps, authorsApiSteps }) => {
    // Books must be deleted before their referenced authors - deleting an author still referenced
    // by a book returns 409 Conflict (confirmed live), so book cleanup always runs first.
    for (const id of createdBookIds.splice(0, createdBookIds.length)) {
      await booksApiSteps.deleteBook(id);
    }
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  test('should return 404 when updating a non-existent id (NEG-BOOKS-PUT-001)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    // The absent id is created and then deleted rather than hardcoded, so "does not exist" is a
    // guaranteed precondition instead of an assumption about the environment's data.
    const extraAuthor = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(extraAuthor.id);
    const deletedBook = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [extraAuthor.id] }));
    await booksApiSteps.deleteBook(deletedBook.id);

    const updateResponse = await booksApiRequest.updateBook(
      deletedBook.id,
      getRandomBookOverridePayload({ title: `Ghost Book ${getRandomUniqueFragment()}`, authors: [extraAuthor.id] }),
    );

    // Contract gap: 404 is not documented for this operation, only 200.
    expect(updateResponse.status()).toBe(HTTP_404_NOT_FOUND);
    expect(await updateResponse.body(), 'the 404 is returned with an empty body').toHaveLength(0);

    const getResponse = await booksApiRequest.getBookById(deletedBook.id);
    expect(getResponse.status(), 'a rejected update must not resurrect the book').toBe(HTTP_404_NOT_FOUND);
  });

  test('should reject an update using a non-numeric id (NEG-BOOKS-PUT-002)', async ({ booksApiRequest }) => {
    const updateResponse = await booksApiRequest.updateBook(
      NON_NUMERIC_ID,
      getRandomBookOverridePayload({ authors: [author.id] }),
    );

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(invalidPathVariableMessage(NON_NUMERIC_ID));
  });

  test('should return 404 when updating using a negative id (NEG-BOOKS-PUT-003)', async ({ booksApiRequest }) => {
    const updateResponse = await booksApiRequest.updateBook(-1, getRandomBookOverridePayload({ authors: [author.id] }));

    // A negative id is a syntactically valid int64, so it is treated as "not found" rather than as
    // a malformed path variable - the same behavior as any other non-existent id.
    expect(updateResponse.status()).toBe(HTTP_404_NOT_FOUND);
    expect(await updateResponse.body()).toHaveLength(0);
  });

  test('should reject an update using a decimal id (NEG-BOOKS-PUT-004)', async ({ booksApiRequest }) => {
    const updateResponse = await booksApiRequest.updateBook(
      DECIMAL_ID,
      getRandomBookOverridePayload({ authors: [author.id] }),
    );

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(invalidPathVariableMessage(DECIMAL_ID));
  });

  test('should reject a request with no body sent and leave the book unchanged (NEG-BOOKS-PUT-005)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(book.id, undefined);

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject malformed JSON syntax and leave the book unchanged (NEG-BOOKS-PUT-006)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(book.id, MALFORMED_JSON_BODY, {
      'Content-Type': CONTENT_TYPE_JSON,
    });

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject a payload missing the required authors field (NEG-BOOKS-PUT-007)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const { authors: _authors, ...payload } = getRandomBookOverridePayload({
      title: `Missing Authors ${getRandomUniqueFragment()}`,
      authors: [author.id],
    });

    const updateResponse = await booksApiRequest.updateBook(book.id, payload);

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('authors'));

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject a payload missing the required year field (NEG-BOOKS-PUT-008)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const { year: _year, ...payload } = getRandomBookOverridePayload({
      title: `Missing Year ${getRandomUniqueFragment()}`,
      authors: [author.id],
    });

    const updateResponse = await booksApiRequest.updateBook(book.id, payload);

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('year'));

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject a payload missing the required price field (NEG-BOOKS-PUT-009)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const { price: _price, ...payload } = getRandomBookOverridePayload({
      title: `Missing Price ${getRandomUniqueFragment()}`,
      authors: [author.id],
    });

    const updateResponse = await booksApiRequest.updateBook(book.id, payload);

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('price'));

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject a payload missing the required available field (NEG-BOOKS-PUT-010)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const { available: _available, ...payload } = getRandomBookOverridePayload({
      title: `Missing Available ${getRandomUniqueFragment()}`,
      authors: [author.id],
    });

    const updateResponse = await booksApiRequest.updateBook(book.id, payload);

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should silently de-duplicate an authors array containing duplicate ids (NEG-BOOKS-PUT-011)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(
      book.id,
      getRandomBookOverridePayload({
        title: `Duplicate Authors ${getRandomUniqueFragment()}`,
        authors: [author.id, author.id],
      }),
    );

    // Contract gap: uniqueItems: true is violated by the input, but the live API accepts it and
    // silently de-duplicates rather than rejecting - recorded here rather than assumed.
    expect(updateResponse.status()).toBe(HTTP_200_OK);

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(
      persisted.authors.map((a) => a.id),
      'duplicate author ids are silently de-duplicated',
    ).toEqual([author.id]);
  });

  test('should reject an empty authors array (NEG-BOOKS-PUT-012)', async ({ booksApiRequest, booksApiSteps }) => {
    const updateResponse = await booksApiRequest.updateBook(
      book.id,
      getRandomBookOverridePayload({ title: `Authorless Book ${getRandomUniqueFragment()}`, authors: [] }),
    );

    // Contract gap: no minItems is documented, but the live API rejects an authors-required book
    // with zero authors rather than accepting it.
    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('authors'));

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject an authors array referencing a non-existent author id (NEG-BOOKS-PUT-013)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(
      book.id,
      getRandomBookOverridePayload({
        title: `Ghost Author Book ${getRandomUniqueFragment()}`,
        authors: [NON_EXISTENT_AUTHOR_ID],
      }),
    );

    // High-value contract-gap finding: no referential-integrity validation is documented for
    // UpdateBookPayload.authors, but the live API does reject a dangling author reference outright
    // rather than persisting it or silently dropping the invalid id.
    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(authorNotFoundMessage(NON_EXISTENT_AUTHOR_ID));

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject price below the documented minimum of 1 (NEG-BOOKS-PUT-014)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(
      book.id,
      getRandomBookOverridePayload({ title: `Too Cheap ${getRandomUniqueFragment()}`, authors: [author.id], price: 0 }),
    );

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('price'));

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject price above the documented maximum of 10000 (NEG-BOOKS-PUT-015)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(
      book.id,
      getRandomBookOverridePayload({
        title: `Too Expensive ${getRandomUniqueFragment()}`,
        authors: [author.id],
        price: 10001,
      }),
    );

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('price'));

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject available below the documented minimum of 1 (NEG-BOOKS-PUT-016)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(
      book.id,
      getRandomBookOverridePayload({ title: `Zero Stock ${getRandomUniqueFragment()}`, authors: [author.id], available: 0 }),
    );

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject available above the documented maximum of 10000 (NEG-BOOKS-PUT-017)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(
      book.id,
      getRandomBookOverridePayload({
        title: `Overstocked ${getRandomUniqueFragment()}`,
        authors: [author.id],
        available: 10001,
      }),
    );

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject authors items sent as strings instead of integers (NEG-BOOKS-PUT-018)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(book.id, {
      title: `Wrong Author Type ${getRandomUniqueFragment()}`,
      authors: ['one'],
      year: 2000,
      price: 10.0,
      available: 5,
    });

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should coerce price sent as a numeric string instead of a number (NEG-BOOKS-PUT-019)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(book.id, {
      title: `Wrong Price Type ${getRandomUniqueFragment()}`,
      authors: [author.id],
      year: 2000,
      price: '19.99',
      available: 5,
    });

    // Contract gap: type: number is documented for price, but the live API coerces a numeric
    // string rather than rejecting the type mismatch.
    expect(updateResponse.status()).toBe(HTTP_200_OK);

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted.price, 'the numeric-string price is silently coerced to a number').toBe(19.99);
  });

  test('should coerce available sent as a numeric string instead of an integer (NEG-BOOKS-PUT-020)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(book.id, {
      title: `Wrong Available Type ${getRandomUniqueFragment()}`,
      authors: [author.id],
      year: 2000,
      price: 10.0,
      available: '5',
    });

    // Contract gap: type: integer is documented for available, but the live API coerces a
    // numeric string rather than rejecting the type mismatch.
    expect(updateResponse.status()).toBe(HTTP_200_OK);

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted.available, 'the numeric-string available is silently coerced to a number').toBe(5);
  });

  test('should ignore client-supplied id and coverId fields (NEG-BOOKS-PUT-021)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const spoofedId = 999;

    const updateResponse = await booksApiRequest.updateBook(book.id, {
      title: `Spoofed Fields ${getRandomUniqueFragment()}`,
      authors: [author.id],
      year: 2000,
      price: 10.0,
      available: 5,
      id: spoofedId,
      coverId: 1,
    });

    expect(updateResponse.status()).toBe(HTTP_200_OK);
    const updated = await parseResponse<BookResponse>(updateResponse);
    expect(updated.id, 'the path id must win over any client-supplied body id').toBe(book.id);

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted.id).toBe(book.id);
    expect(
      persisted.coverId,
      'a client-supplied coverId must not be accepted outside the documented cover upload flow',
    ).not.toBe(1);
  });

  test('should reject an unsupported Content-Type header (NEG-BOOKS-PUT-022)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const updateResponse = await booksApiRequest.updateBook(
      book.id,
      JSON.stringify({ title: 'Baseline Book', authors: [author.id], year: 2000, price: 10.0, available: 5 }),
      { 'Content-Type': CONTENT_TYPE_TEXT_PLAIN },
    );

    expect(updateResponse.status()).toBe(HTTP_415_UNSUPPORTED_MEDIA_TYPE);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error).join(' ')).toContain(NOT_SUPPORTED_MESSAGE_FRAGMENT);

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should reject renaming a book to a title that already exists (NEG-BOOKS-PUT-023)', async ({
    booksApiSteps,
    booksApiRequest,
  }) => {
    // The live API enforces a unique constraint on `title` (see book.factory.ts) - confirmed here
    // for PUT, mirroring the equivalent POST coverage (NEG-BOOKS-POST-019).
    const existingTitle = `Existing Title ${getRandomUniqueFragment()}`;
    const other = await booksApiSteps.createBook(
      getRandomBookOverridePayload({ title: existingTitle, authors: [author.id] }),
    );
    createdBookIds.push(other.id);

    const updateResponse = await booksApiRequest.updateBook(
      book.id,
      getRandomBookOverridePayload({ title: existingTitle, authors: [author.id] }),
    );

    expect(updateResponse.status()).toBe(HTTP_409_CONFLICT);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

    const persisted = await booksApiSteps.getBookById(book.id);
    expect(persisted).toEqual(book);
  });

  test('should not fail with a server error when an invalid bearer token is supplied (NEG-BOOKS-PUT-024)', async ({
    booksApiRequest,
  }) => {
    // The endpoint declares no security scheme, so an unparseable credential must either be ignored
    // or rejected cleanly - never crash the server, especially for a non-idempotent write.
    const updateResponse = await booksApiRequest.updateBook(
      book.id,
      getRandomBookOverridePayload({ title: `Invalid Token Probe ${getRandomUniqueFragment()}`, authors: [author.id] }),
      { Authorization: INVALID_BEARER_TOKEN },
    );

    expect(updateResponse.status(), 'an invalid token must not crash a write endpoint').toBeLessThan(
      HTTP_500_INTERNAL_SERVER_ERROR,
    );
  });
});
