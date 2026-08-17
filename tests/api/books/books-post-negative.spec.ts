import { test, expect } from '@fixtures/test.fixture';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import { BookResponse, BookSchema } from '@api/models/book.model';
import {
  HTTP_201_CREATED,
  HTTP_400_BAD_REQUEST,
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
} from '@api/consts/api.error.messages.const';
import { INVALID_BEARER_TOKEN, NON_EXISTENT_AUTHOR_ID } from '@data/negative.inputs.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';
import { parseResponse } from '@utils/parse.response.utils';
import { getRandomUniqueFragment } from '@utils/random.data.utils';

// The OpenAPI spec documents only a 201 response for POST /books - no error responses (400, 401,
// 403, 404, 409, 415, 500) are declared for createBook. Every case below was probed directly
// against the live API and asserts the exact observed status code/message (mirroring the sibling
// POST /authors negative tests) - including the price/available boundary cases
// (NEG-BOOKS-POST-010..013), which the sibling PUT/PATCH negative tests already prove return 400
// with a field-specific message.

test.describe('POST /books - negative and robustness scenarios', { tag: ['@api', '@books', '@regression'] }, () => {
  const createdBookIds: number[] = [];
  const createdAuthorIds: number[] = [];

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

  test('should reject a request with no body sent (NEG-BOOKS-POST-001)', async ({ booksApiRequest }) => {
    const response = await booksApiRequest.createBook(undefined, { 'Content-Type': CONTENT_TYPE_JSON });

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);
  });

  test('should reject malformed JSON syntax in the request body (NEG-BOOKS-POST-002)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    // A unique title is embedded in the malformed body so the follow-up GET /books check below
    // cannot collide with titles from other tests (the title filter matches any substring).
    const uniqueTitle = `MalformedProbe${getRandomUniqueFragment()}`;
    const response = await booksApiRequest.createBook(
      `{ "title": "${uniqueTitle}", "authors": [1], "year": 2000, "price": }`,
      { 'Content-Type': CONTENT_TYPE_JSON },
    );

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

    const books = await booksApiSteps.getBooks({ title: uniqueTitle });
    expect(books, 'no book must be created from a malformed request').toEqual([]);
  });

  test('should reject a payload missing the required authors field (NEG-BOOKS-POST-003)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const title = `Missing Authors ${getRandomUniqueFragment()}`;
    const response = await booksApiRequest.createBook({ title, year: 2000, price: 10.0, available: 5 });

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('authors'));

    const books = await booksApiSteps.getBooks({ title });
    expect(books).toEqual([]);
  });

  test('should reject a payload missing the required year field (NEG-BOOKS-POST-004)', async ({
    authorsApiSteps,
    booksApiRequest,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Missing Year ${getRandomUniqueFragment()}`;

    const response = await booksApiRequest.createBook({ title, authors: [author.id], price: 10.0, available: 5 });

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('year'));

    const books = await booksApiSteps.getBooks({ title });
    expect(books).toEqual([]);
  });

  test('should reject a payload missing the required price field (NEG-BOOKS-POST-005)', async ({
    authorsApiSteps,
    booksApiRequest,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Missing Price ${getRandomUniqueFragment()}`;

    const response = await booksApiRequest.createBook({ title, authors: [author.id], year: 2000, available: 5 });

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('price'));

    const books = await booksApiSteps.getBooks({ title });
    expect(books).toEqual([]);
  });

  test('should reject a payload missing the required available field (NEG-BOOKS-POST-006)', async ({
    authorsApiSteps,
    booksApiRequest,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Missing Available ${getRandomUniqueFragment()}`;

    const response = await booksApiRequest.createBook({ title, authors: [author.id], year: 2000, price: 10.0 });

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

    const books = await booksApiSteps.getBooks({ title });
    expect(books).toEqual([]);
  });

  test('should silently de-duplicate a duplicate author id in authors (NEG-BOOKS-POST-007)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Duplicate Authors ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({ title, authors: [author.id, author.id], year: 2000, price: 10.0, available: 5 });

    // CONTRACT-GAP FINDING: uniqueItems: true is documented on CreateBookPayload.authors, but the
    // live API accepts a duplicate-id array (201) and silently de-duplicates it rather than
    // rejecting the request.
    const created = await booksApiSteps.createBook(payload);
    createdBookIds.push(created.id);
    expect(created.authors, 'the duplicate id is silently de-duplicated').toHaveLength(1);
    expect(created.authors[0].id).toBe(author.id);
  });

  test('should reject an empty authors array (NEG-BOOKS-POST-008)', async ({ booksApiRequest }) => {
    const title = `Authorless Book ${getRandomUniqueFragment()}`;

    const response = await booksApiRequest.createBook({ title, authors: [], year: 2000, price: 10.0, available: 5 });

    expect(response.status(), 'an empty authors array is rejected despite no documented minItems').toBe(
      HTTP_400_BAD_REQUEST,
    );
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('authors'));
  });

  test('should reject a non-existent author id in authors (NEG-BOOKS-POST-009)', async ({
    booksApiRequest,
    booksApiSteps,
  }) => {
    const title = `Ghost Author Book ${getRandomUniqueFragment()}`;

    const response = await booksApiRequest.createBook({
      title,
      authors: [NON_EXISTENT_AUTHOR_ID],
      year: 2000,
      price: 10.0,
      available: 5,
    });

    // KEY FINDING: referential integrity IS enforced live, despite CreateBookPayload.authors
    // documenting only `type: integer(int64)` per item with no documented existence validation and
    // no 400/404 response declared for createBook. The API rejects the request outright rather than
    // silently dropping the id or creating a dangling reference.
    expect(response.status(), 'a non-existent author id is rejected, not silently dropped').toBe(
      HTTP_400_BAD_REQUEST,
    );
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(authorNotFoundMessage(NON_EXISTENT_AUTHOR_ID));

    const books = await booksApiSteps.getBooks({ title });
    expect(books).toEqual([]);
  });

  test('should reject price below the documented minimum of 0.01 (NEG-BOOKS-POST-010)', async ({
    authorsApiSteps,
    booksApiRequest,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Too Cheap ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({ title, authors: [author.id], year: 2000, price: 0, available: 5 });

    const response = await booksApiRequest.createBook(payload);

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('price'));

    const books = await booksApiSteps.getBooks({ title });
    expect(books, 'a rejected create must not leave a leaked book').toEqual([]);
  });

  test('should reject price above the documented maximum of 1000 (NEG-BOOKS-POST-011)', async ({
    authorsApiSteps,
    booksApiRequest,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Too Expensive ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({
      title,
      authors: [author.id],
      year: 2000,
      price: 1000.01,
      available: 5,
    });

    const response = await booksApiRequest.createBook(payload);

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('price'));

    const books = await booksApiSteps.getBooks({ title });
    expect(books, 'a rejected create must not leave a leaked book').toEqual([]);
  });

  test('should reject available below the documented minimum of 1 (NEG-BOOKS-POST-012)', async ({
    authorsApiSteps,
    booksApiRequest,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Zero Stock ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({ title, authors: [author.id], year: 2000, price: 10.0, available: 0 });

    const response = await booksApiRequest.createBook(payload);

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

    const books = await booksApiSteps.getBooks({ title });
    expect(books, 'a rejected create must not leave a leaked book').toEqual([]);
  });

  test('should reject available above the documented maximum of 10000 (NEG-BOOKS-POST-013)', async ({
    authorsApiSteps,
    booksApiRequest,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Overstocked ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({
      title,
      authors: [author.id],
      year: 2000,
      price: 10.0,
      available: 10001,
    });

    const response = await booksApiRequest.createBook(payload);

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

    const books = await booksApiSteps.getBooks({ title });
    expect(books, 'a rejected create must not leave a leaked book').toEqual([]);
  });

  test('should reject authors items sent as strings instead of integers (NEG-BOOKS-POST-014)', async ({
    booksApiRequest,
  }) => {
    const title = `Wrong Author Type ${getRandomUniqueFragment()}`;

    const response = await booksApiRequest.createBook({ title, authors: ['one'], year: 2000, price: 10.0, available: 5 });

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);
  });

  test('should coerce a string price value instead of rejecting it (NEG-BOOKS-POST-015)', async ({
    authorsApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Wrong Price Type ${getRandomUniqueFragment()}`;

    const response = await booksApiRequest.createBook({ title, authors: [author.id], year: 2000, price: '19.99', available: 5 });

    // CONTRACT-GAP FINDING: price documents type: number, but the live API accepts and coerces a
    // numeric string rather than rejecting the type mismatch.
    expect(response.status(), 'a numeric string is coerced rather than rejected').toBe(HTTP_201_CREATED);
    const created = await parseResponse<BookResponse>(response);
    createdBookIds.push(created.id);
    expect(created.price).toBe(19.99);
  });

  test('should coerce a string available value instead of rejecting it (NEG-BOOKS-POST-016)', async ({
    authorsApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Wrong Available Type ${getRandomUniqueFragment()}`;

    const response = await booksApiRequest.createBook({ title, authors: [author.id], year: 2000, price: 10.0, available: '5' });

    // CONTRACT-GAP FINDING: available documents type: integer, but the live API accepts and
    // coerces a numeric string rather than rejecting the type mismatch.
    expect(response.status(), 'a numeric string is coerced rather than rejected').toBe(HTTP_201_CREATED);
    const created = await parseResponse<BookResponse>(response);
    createdBookIds.push(created.id);
    expect(created.available).toBe(5);
  });

  test('should ignore client-supplied id and coverId fields (NEG-BOOKS-POST-017)', async ({
    authorsApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Spoofed Fields ${getRandomUniqueFragment()}`;
    const clientSuppliedId = 999;

    const response = await booksApiRequest.createBook({
      title,
      authors: [author.id],
      year: 2000,
      price: 10.0,
      available: 5,
      id: clientSuppliedId,
      coverId: 1,
    });

    expect(response.status(), 'undocumented fields are ignored, not rejected').toBe(HTTP_201_CREATED);
    const result = BookSchema.safeParse(await parseResponse<unknown>(response));
    expect(result.success, `response violates the Book contract: ${JSON.stringify(result.error?.issues)}`).toBe(true);

    const created = result.data!;
    createdBookIds.push(created.id);
    expect(created.id, 'the server must generate the id, ignoring the client-supplied one').not.toBe(clientSuppliedId);
    expect(created.coverId, 'coverId cannot be set via the create payload').toBeNull();
  });

  test('should reject an unsupported Content-Type header (NEG-BOOKS-POST-018)', async ({
    authorsApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);

    const response = await booksApiRequest.createBook(
      `{ "title": "Baseline Book", "authors": [${author.id}], "year": 2000, "price": 10.00, "available": 5 }`,
      { 'Content-Type': CONTENT_TYPE_TEXT_PLAIN },
    );

    expect(response.status()).toBe(HTTP_415_UNSUPPORTED_MEDIA_TYPE);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error).join(' ')).toContain(NOT_SUPPORTED_MESSAGE_FRAGMENT);
  });

  test('should reject creating a book with a title that already exists (NEG-BOOKS-POST-019)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    // The live API enforces a unique constraint on `title` (see book.factory.ts) - confirmed here
    // rather than assumed, mirroring the referential-integrity 409 coverage already present for
    // DELETE /books/{id} (NEG-BOOKS-DELETE-007).
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Duplicate Title ${getRandomUniqueFragment()}`;
    const existing = await booksApiSteps.createBook(getRandomBookOverridePayload({ title, authors: [author.id] }));
    createdBookIds.push(existing.id);

    const response = await booksApiRequest.createBook(getRandomBookOverridePayload({ title, authors: [author.id] }));

    expect(response.status()).toBe(HTTP_409_CONFLICT);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);
  });

  test('should not fail with a server error when an invalid bearer token is supplied (NEG-BOOKS-POST-020)', async ({
    authorsApiSteps,
    booksApiRequest,
  }) => {
    // The endpoint declares no security scheme, so an unparseable credential must either be ignored
    // or rejected cleanly - never crash the server, especially for a non-idempotent write.
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Invalid Token Probe ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({ title, authors: [author.id] });

    const response = await booksApiRequest.createBook(payload, { Authorization: INVALID_BEARER_TOKEN });

    expect(response.status(), 'an invalid token must not crash a write endpoint').toBeLessThan(
      HTTP_500_INTERNAL_SERVER_ERROR,
    );
    if (response.status() === HTTP_201_CREATED) {
      const created = await parseResponse<BookResponse>(response);
      createdBookIds.push(created.id);
    }
  });
});
