import { test, expect } from '@fixtures/test.fixture';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import { BookSchema } from '@api/models/book.model';
import { HTTP_201_CREATED, HTTP_400_BAD_REQUEST } from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { incorrectInputDataMessage } from '@api/consts/api.error.messages.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';
import { parseResponse } from '@utils/parse.response.utils';
import { getRandomUniqueFragment } from '@utils/random.data.utils';

// CONTRACT DEVIATION (probed against the live API): CreateBookPayload.title is optional per the
// OpenAPI schema (absent from `required`), but the running API rejects a payload with a missing,
// null, or empty title with 400 {"message":["title incorrect input data"]}. This mirrors the
// analogous firstName/lastName deviation already recorded for POST /authors. POS-BOOKS-POST-003
// below asserts the actual observed 400 rather than the schema-implied 201.
//
// CONTRACT-GAP FINDING (probed live): CreateBookPayload.year has no documented minimum/maximum in
// the OpenAPI schema, but the running API rejects year < 1900 with 400 "year incorrect input data".
// Every payload below therefore uses a year >= 1900 so happy-path tests do not trip this
// undocumented floor.

test.describe('POST /books - positive scenarios', { tag: ['@api', '@books', '@smoke'] }, () => {
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

  test('should create a book with a fully populated valid payload (POS-BOOKS-POST-001)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Moby Dick ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({ title, authors: [author.id], year: 1900, price: 19.99, available: 25 });

    const created = await booksApiSteps.createBook(payload);
    createdBookIds.push(created.id);

    const books = await booksApiSteps.getBooks({ title });
    const match = books.find((item) => item.id === created.id);
    expect(match, 'the created book must be retrievable via GET /books').toBeDefined();
    expect(match).toMatchObject({ title, year: 1900, price: 19.99, available: 25 });
  });

  test('should associate a book with multiple unique existing authors (POS-BOOKS-POST-002)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const authorOne = await authorsApiSteps.createAuthor();
    const authorTwo = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(authorOne.id, authorTwo.id);
    const title = `Good Omens ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({
      title,
      authors: [authorOne.id, authorTwo.id],
      year: 1990,
      price: 15.5,
      available: 10,
    });

    const created = await booksApiSteps.createBook(payload);
    createdBookIds.push(created.id);

    const book = await booksApiSteps.getBookById(created.id);
    expect(book.authors).toHaveLength(2);
    expect(book.authors).toEqual(
      expect.arrayContaining([
        { id: authorOne.id, firstName: authorOne.firstName, lastName: authorOne.lastName },
        { id: authorTwo.id, firstName: authorTwo.firstName, lastName: authorTwo.lastName },
      ]),
    );
  });

  test('should reject a payload omitting the optional title field (POS-BOOKS-POST-003)', async ({
    authorsApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);

    const response = await booksApiRequest.createBook({ authors: [author.id], year: 2001, price: 9.99, available: 5 });

    // Live deviation from the documented schema - see the file-level note above.
    expect(response.status(), 'the live API requires title despite the optional schema').toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('title'));
  });

  test('should accept price at the documented minimum boundary of 0.01 (POS-BOOKS-POST-004)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Penny Paperback ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({ title, authors: [author.id], year: 2010, price: 0.01, available: 5 });

    const created = await booksApiSteps.createBook(payload);
    createdBookIds.push(created.id);

    const book = await booksApiSteps.getBookById(created.id);
    expect(book.price).toBe(0.01);
  });

  test('should accept price at the documented maximum boundary of 1000 (POS-BOOKS-POST-005)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Rare First Edition ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({ title, authors: [author.id], year: 1920, price: 1000, available: 1 });

    const created = await booksApiSteps.createBook(payload);
    createdBookIds.push(created.id);

    const book = await booksApiSteps.getBookById(created.id);
    expect(book.price).toBe(1000);
  });

  test('should accept available at the documented minimum boundary of 1 (POS-BOOKS-POST-006)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Last Copy ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({ title, authors: [author.id], year: 2015, price: 12.0, available: 1 });

    const created = await booksApiSteps.createBook(payload);
    createdBookIds.push(created.id);

    const book = await booksApiSteps.getBookById(created.id);
    expect(book.available).toBe(1);
  });

  test('should accept available at the documented maximum boundary of 10000 (POS-BOOKS-POST-007)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Mass Market Reprint ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({ title, authors: [author.id], year: 2020, price: 5.0, available: 10000 });

    const created = await booksApiSteps.createBook(payload);
    createdBookIds.push(created.id);

    const book = await booksApiSteps.getBookById(created.id);
    expect(book.available).toBe(10000);
  });

  test('should be retrievable via GET /books with its authors resolved to full details via GET /books/{id} (POS-BOOKS-POST-008)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `Data Consistency Test Book ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({ title, authors: [author.id], year: 1999, price: 29.99, available: 3 });

    const created = await booksApiSteps.createBook(payload);
    createdBookIds.push(created.id);

    const books = await booksApiSteps.getBooks({ title });
    const match = books.find((item) => item.id === created.id);
    expect(match, 'the created book must appear in the GET /books results').toBeDefined();
    expect(match).toMatchObject({ title, year: 1999, price: 29.99, available: 3 });

    // GET /books list items expose authors as RestAuthor (firstName/lastName only, no id) - the
    // id-to-object resolution documented on Book/Author is only observable via GET /books/{id}.
    const book = await booksApiSteps.getBookById(created.id);
    expect(book.authors.map((entry) => entry.id)).toContain(author.id);
  });

  test('should create a book without any Authorization header (POS-BOOKS-POST-009)', async ({
    authorsApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const title = `No Auth Book ${getRandomUniqueFragment()}`;
    const payload = getRandomBookOverridePayload({ title, authors: [author.id], year: 2022, price: 14.99, available: 8 });

    // The spec declares no securitySchemes and no security requirement, so no Authorization header
    // is sent here - matching every other request in this file.
    const response = await booksApiRequest.createBook(payload);

    expect(response.status(), 'POST /books is unauthenticated - revisit if security is added').toBe(HTTP_201_CREATED);
    expect(response.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const result = BookSchema.safeParse(await parseResponse<unknown>(response));
    expect(result.success, `response violates the Book contract: ${JSON.stringify(result.error?.issues)}`).toBe(true);

    const created = result.data!;
    createdBookIds.push(created.id);
    expect(created).toMatchObject({ title, year: 2022, price: 14.99, available: 8 });
  });
});
