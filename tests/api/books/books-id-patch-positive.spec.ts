import { test, expect } from '@fixtures/test.fixture';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import { HTTP_200_OK } from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { getRandomUniqueFragment } from '@utils/random.data.utils';

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

test.describe('PATCH /books/{id} - positive scenarios', { tag: ['@api', '@books', '@smoke'] }, () => {
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

  test('should partially update only title, leaving other fields unchanged (POS-BOOKS-PATCH-001)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);
    const patchedTitle = `PatchedTitle ${getRandomUniqueFragment()}`;

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { title: patchedTitle });

    expect(patchResponse.status()).toBe(HTTP_200_OK);
    expect(patchResponse.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.title).toBe(patchedTitle);
    expect(book.year).toBe(original.year);
    expect(book.price).toBe(original.price);
    expect(book.available).toBe(original.available);
    expect(book.authors.map((a) => a.id)).toEqual([author.id]);
  });

  test('should partially update only year, leaving other fields unchanged (POS-BOOKS-PATCH-002)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { year: 1999 });
    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.year).toBe(1999);
    expect(book.title).toBe(original.title);
    expect(book.price).toBe(original.price);
    expect(book.available).toBe(original.available);
    expect(book.authors.map((a) => a.id)).toEqual([author.id]);
  });

  test('should partially update only price with a mid-range value (POS-BOOKS-PATCH-003)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { price: 15.5 });
    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.price).toBe(15.5);
    expect(book.title).toBe(original.title);
    expect(book.year).toBe(original.year);
    expect(book.available).toBe(original.available);
  });

  test('should partially update only available with a mid-range value (POS-BOOKS-PATCH-004)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { available: 10 });
    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.available).toBe(10);
    expect(book.title).toBe(original.title);
    expect(book.year).toBe(original.year);
    expect(book.price).toBe(original.price);
  });

  test('should fully replace authors on reassignment rather than merging (POS-BOOKS-PATCH-005)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const authorA = await authorsApiSteps.createAuthor();
    const authorB = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(authorA.id, authorB.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [authorA.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { authors: [authorB.id] });
    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const book = await booksApiSteps.getBookById(original.id);
    // Confirmed by live probing: the authors array is fully replaced, not merged/appended - author
    // A is no longer present once author B is patched in.
    expect(book.authors.map((a) => a.id)).toEqual([authorB.id]);
    expect(book.title).toBe(original.title);
    expect(book.year).toBe(original.year);
    expect(book.price).toBe(original.price);
    expect(book.available).toBe(original.available);
  });

  test('should update multiple fields atomically while leaving year unchanged (POS-BOOKS-PATCH-006)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const authorA = await authorsApiSteps.createAuthor();
    const authorB = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(authorA.id, authorB.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [authorA.id] }));
    createdBookIds.push(original.id);
    const multiPatchedTitle = `MultiPatchedTitle ${getRandomUniqueFragment()}`;

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, {
      title: multiPatchedTitle,
      price: 22.0,
      available: 30,
      authors: [authorA.id, authorB.id],
    });
    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.title).toBe(multiPatchedTitle);
    expect(book.price).toBe(22);
    expect(book.available).toBe(30);
    expect(book.authors.map((a) => a.id).sort()).toEqual([authorA.id, authorB.id].sort());
    expect(book.year, 'year was omitted from the payload and must be unaffected').toBe(original.year);
  });

  test('should accept an empty body as a no-op and leave the book unchanged (POS-BOOKS-PATCH-007)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, {});
    expect(patchResponse.status(), 'an empty partial update is contract-valid since no field is required').toBe(
      HTTP_200_OK,
    );

    const book = await booksApiSteps.getBookById(original.id);
    expect(book).toEqual(original);
  });

  test('should converge to the same state after repeated identical patches (POS-BOOKS-PATCH-008)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);
    const idempotentTitle = `IdempotentTitle ${getRandomUniqueFragment()}`;
    const payload = { title: idempotentTitle };

    const firstPatch = await booksApiRequest.updateBookPartially(original.id, payload);
    expect(firstPatch.status()).toBe(HTTP_200_OK);

    const secondPatch = await booksApiRequest.updateBookPartially(original.id, payload);
    expect(secondPatch.status(), 'repeated identical patches must both succeed').toBe(HTTP_200_OK);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.title).toBe(idempotentTitle);
  });

  test('should accept price at the boundaries actually enforced by PATCH (POS-BOOKS-PATCH-009)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const minResponse = await booksApiRequest.updateBookPartially(original.id, { price: 1 });
    expect(minResponse.status()).toBe(HTTP_200_OK);
    expect((await booksApiSteps.getBookById(original.id)).price).toBe(1);

    // UpdateBookPayload (used by PUT /books/{id}) documents price maximum as 10000, but live
    // probing of this PATCH endpoint found it actually enforces a maximum of 1000 (matching
    // CreateBookPayload.maximum instead) - price: 10000 is rejected with 400 "price incorrect
    // input data" (see NEG-BOOKS-PATCH-012 in the negative spec). This is a cross-endpoint
    // contract-gap finding: the two operations mutate the same Book resource but enforce different
    // price ceilings.
    const maxResponse = await booksApiRequest.updateBookPartially(original.id, { price: 1000 });
    expect(maxResponse.status()).toBe(HTTP_200_OK);
    expect((await booksApiSteps.getBookById(original.id)).price).toBe(1000);
  });

  test('should accept available at its documented boundaries, 1 and 10000 (POS-BOOKS-PATCH-010)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);

    const minResponse = await booksApiRequest.updateBookPartially(original.id, { available: 1 });
    expect(minResponse.status()).toBe(HTTP_200_OK);
    expect((await booksApiSteps.getBookById(original.id)).available).toBe(1);

    const maxResponse = await booksApiRequest.updateBookPartially(original.id, { available: 10000 });
    expect(maxResponse.status()).toBe(HTTP_200_OK);
    expect((await booksApiSteps.getBookById(original.id)).available).toBe(10000);
  });

  test('should update a book without an Authorization header (POS-BOOKS-PATCH-011)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(original.id);
    const noAuthTitle = `NoAuthPatch ${getRandomUniqueFragment()}`;

    // The spec declares no securitySchemes for this endpoint, so no Authorization header is sent.
    const patchResponse = await booksApiRequest.updateBookPartially(original.id, { title: noAuthTitle });

    expect(patchResponse.status(), 'PATCH /books/{id} is unauthenticated').toBe(HTTP_200_OK);
    expect(patchResponse.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const book = await booksApiSteps.getBookById(original.id);
    expect(book.title).toBe(noAuthTitle);
  });

  test('should reflect a patched title and reassigned author in GET /books filters (POS-BOOKS-PATCH-012)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const authorA = await authorsApiSteps.createAuthor();
    const authorB = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(authorA.id, authorB.id);
    const original = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [authorA.id] }));
    createdBookIds.push(original.id);
    const consistencyTitle = `ConsistencyCheckTitle ${getRandomUniqueFragment()}`;

    const patchResponse = await booksApiRequest.updateBookPartially(original.id, {
      title: consistencyTitle,
      authors: [authorB.id],
    });
    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const byTitle = await booksApiSteps.getBooks({ title: consistencyTitle });
    const titleMatch = byTitle.find((b) => b.id === original.id);
    expect(titleMatch, 'the patched book must be reachable through the updated title filter').toBeDefined();
    expect(titleMatch?.title).toBe(consistencyTitle);

    const byAuthor = await booksApiSteps.getBooks({ author: authorB.firstName });
    const authorMatch = byAuthor.find((b) => b.id === original.id);
    expect(authorMatch, 'the patched book must be reachable through the reassigned author filter').toBeDefined();
    expect(authorMatch?.authors.some((a) => a.firstName === authorB.firstName)).toBe(true);
  });
});
