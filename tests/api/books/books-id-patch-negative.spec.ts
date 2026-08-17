import { test, expect } from '@fixtures/test.fixture';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_415_UNSUPPORTED_MEDIA_TYPE,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
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
  NON_EXISTENT_AUTHOR_ID,
  NON_NUMERIC_ID,
  NON_OBJECT_ARRAY_BODY,
  UNTERMINATED_JSON_BODY,
} from '@data/negative.inputs.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';

// The OpenAPI spec documents only a 200 response for PATCH /books/{id} (operationId
// `partialUpdateBook`) - no 400/401/403/404/409/500 responses are declared, and the request body
// schema is a generic `type: object, additionalProperties: { type: object }` map with no named
// properties. Every case below was probed directly against the live API and asserts the exact
// observed status code and, where stable, the exact error message - rather than a loose "not 200"
// range - so a regression (e.g. 400 silently becoming 200, or a validation error turning into a
// 500 crash) is caught instead of passing unnoticed. Findings that diverge from the sibling PUT
// contract or from a graceful-failure expectation are called out inline as contract-gap/defect
// comments.

test.describe('PATCH /books/{id} - negative and robustness scenarios', { tag: ['@api', '@books', '@regression'] }, () => {
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

  const invalidIdPaths = [
    { description: 'a non-numeric id path parameter (abc)', id: NON_NUMERIC_ID, caseId: 'NEG-BOOKS-PATCH-001' },
    { description: 'a decimal id path parameter (1.5)', id: DECIMAL_ID, caseId: 'NEG-BOOKS-PATCH-002' },
  ];

  invalidIdPaths.forEach(({ description, id, caseId }) => {
    test(`should reject a PATCH with ${description} (${caseId})`, async ({ booksApiRequest }) => {
      const patchResponse = await booksApiRequest.updateBookPartially(id, { title: 'PatchedTitle' });

      expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(patchResponse);
      expect(getApiErrorMessages(error)).toContain(invalidPathVariableMessage(id));
    });
  });

  test('should return 404 with an empty body when patching a non-existent book id (NEG-BOOKS-PATCH-003)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    // The absent id is created and then deleted rather than hardcoded, so "does not exist" is a
    // guaranteed precondition instead of an assumption about the environment's data.
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const created = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    // Deleted immediately (not tracked in createdBookIds) so "does not exist" is a guaranteed
    // precondition instead of an assumption about the environment's data, without double-deleting.
    await booksApiSteps.deleteBook(created.id);

    const patchResponse = await booksApiRequest.updateBookPartially(created.id, { title: 'GhostBook' });

    // Contract gap: 404 is not documented for this operation, only 200.
    expect(patchResponse.status()).toBe(HTTP_404_NOT_FOUND);
    expect(await patchResponse.body(), 'the 404 is returned with an empty body').toHaveLength(0);
  });

  test('should reject malformed JSON syntax and leave the book unchanged (NEG-BOOKS-PATCH-004)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, UNTERMINATED_JSON_BODY, {
      'Content-Type': CONTENT_TYPE_JSON,
    });

    expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should reject a non-object (array) request body and leave the book unchanged (NEG-BOOKS-PATCH-005)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, NON_OBJECT_ARRAY_BODY);

    expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should reject title sent as a number and leave the book unchanged (NEG-BOOKS-PATCH-006)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { title: 12345 });

    expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('title'));

    const book = await booksApiSteps.getBookById(original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should reject year sent as a non-numeric string and leave the book unchanged (NEG-BOOKS-PATCH-007)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { year: 'not-a-year' });

    expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('year'));

    const book = await booksApiSteps.getBookById(original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should silently coerce price sent as a numeric string (NEG-BOOKS-PATCH-008)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    // Contract-gap finding: unlike title/year/available (rejected with 400 on a type mismatch),
    // the live API accepts price as a numeric string and silently coerces it to a number instead
    // of rejecting the request.
    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { price: '19.99' });

    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.price).toBe(19.99);
  });

  test('should reject available sent as a numeric string and leave the book unchanged (NEG-BOOKS-PATCH-009)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { available: '5' });

    expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

    const book = await booksApiSteps.getBookById(original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should not crash with a 500 when authors items are sent as strings instead of integers (NEG-BOOKS-PATCH-010)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    // KNOWN DEFECT (expected failure): the realistic authors item type is integer(int64), per the
    // sibling UpdateBookPayload/CreateBookPayload schemas. Sending string items does not return a
    // graceful 400 validation error - the live API throws an unhandled ClassCastException
    // ("class java.lang.String cannot be cast to class java.lang.Integer") and returns a raw 500
    // Internal Server Error. Marked with test.fail() so this stays visible and the test turns red
    // the moment the API is fixed.
    test.fail();

    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { authors: ['one'] });

    expect(patchResponse.status(), 'a type-mismatched authors item must not crash the server').toBeLessThan(500);
  });

  test('should reject price below the realistic minimum of 1 (NEG-BOOKS-PATCH-011)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    // Live probing confirms PATCH enforces the same price lower bound (minimum: 1) as
    // UpdateBookPayload, formally documented only for PUT /books/{id}.
    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { price: 0 });

    expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('price'));

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.price, 'a rejected patch must not mutate the book').toBe(original.price);
  });

  test('should reject price above the realistic maximum enforced by PATCH (NEG-BOOKS-PATCH-012)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    // Cross-endpoint contract-gap finding: UpdateBookPayload (used by PUT) documents price maximum
    // as 10000, but live probing shows PATCH actually enforces a lower maximum of 1000 (matching
    // CreateBookPayload.maximum instead) - both 10000.01 (this payload) and values as low as 1001
    // are rejected. See POS-BOOKS-PATCH-009 in the positive spec for the accepted boundary.
    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { price: 10000.01 });

    expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('price'));

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.price, 'a rejected patch must not mutate the book').toBe(original.price);
  });

  test('should reject available below the documented minimum of 1 (NEG-BOOKS-PATCH-013)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    // Live probing confirms PATCH enforces the same available lower bound (minimum: 1) as
    // UpdateBookPayload, formally documented only for PUT /books/{id}.
    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { available: 0 });

    expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.available, 'a rejected patch must not mutate the book').toBe(original.available);
  });

  test('should reject available above the documented maximum of 10000 (NEG-BOOKS-PATCH-014)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    // Live probing confirms PATCH enforces the same available upper bound (maximum: 10000) as
    // UpdateBookPayload, formally documented only for PUT /books/{id}.
    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { available: 10001 });

    expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('available'));

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.available, 'a rejected patch must not mutate the book').toBe(original.available);
  });

  test('should silently de-duplicate an authors array containing duplicate ids (NEG-BOOKS-PATCH-015)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    // Contract-gap finding: uniqueItems: true is only documented on the sibling
    // UpdateBookPayload/CreateBookPayload.authors schemas, not on this generic PATCH body. Live
    // probing shows the API accepts the duplicate-id array with 200 and silently de-duplicates it
    // rather than rejecting the request.
    const patchResponse = await booksApiRequest.updateBookPartially(original.id, {
      authors: [author.id, author.id],
    });

    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.authors.map((a) => a.id)).toEqual([author.id]);
  });

  test('should reject an authors array referencing a non-existent author id (NEG-BOOKS-PATCH-016)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    // High-value contract-gap finding: no schema/response documents referential-integrity
    // validation for this field on PATCH. Live probing shows the API does enforce it, rejecting the
    // update with a 400 and a descriptive message rather than persisting a dangling reference - on
    // parity with NEG-BOOKS-POST-009's finding for the same underlying relationship.
    const patchResponse = await booksApiRequest.updateBookPartially(original.id, {
      authors: [NON_EXISTENT_AUTHOR_ID],
    });

    expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error)).toContain(authorNotFoundMessage(NON_EXISTENT_AUTHOR_ID));

    const book = await booksApiSteps.getBookById(original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should not let a client override the server-generated id or coverId (NEG-BOOKS-PATCH-017)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    // coverId is documented as managed exclusively via the dedicated multipart
    // PATCH /books/{id}/cover operation. Live probing shows this generic PATCH rejects the payload
    // with a 400 (a server-side Integer/Long type mismatch on the coverId field), so neither id nor
    // coverId is overridden.
    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { id: 999, coverId: 1 });

    expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error).length).toBeGreaterThan(0);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.id, 'the server-generated id must not be overridable via this endpoint').toBe(original.id);
    expect(book.coverId, 'coverId must not be settable via this generic PATCH').toBe(original.coverId);
  });

  test('should reject a request with no Content-Type header (NEG-BOOKS-PATCH-018)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    // The Content-Type header is omitted entirely rather than sent empty. Playwright then defaults
    // to application/octet-stream, which the API refuses with a 415.
    const patchResponse = await booksApiRequest.updateBookPartially(
      original.id,
      '{"title":"NoContentTypeTitle"}',
    );

    expect(patchResponse.status()).toBe(HTTP_415_UNSUPPORTED_MEDIA_TYPE);
    const error = await parseApiError(patchResponse);
    expect(getApiErrorMessages(error).join(' ')).toContain(NOT_SUPPORTED_MESSAGE_FRAGMENT);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book, 'a rejected patch must not mutate the book').toEqual(original);
  });

  test('should not fail with a server error when an invalid bearer token is supplied (NEG-BOOKS-PATCH-019)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    // The endpoint declares no security scheme, so an unparseable credential must either be ignored
    // or rejected cleanly - never crash the server, especially for a non-idempotent write.
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(
      original.id,
      { title: 'InvalidTokenProbe' },
      { Authorization: INVALID_BEARER_TOKEN },
    );

    expect(patchResponse.status(), 'an invalid token must not crash a write endpoint').toBeLessThan(
      HTTP_500_INTERNAL_SERVER_ERROR,
    );
  });
});
