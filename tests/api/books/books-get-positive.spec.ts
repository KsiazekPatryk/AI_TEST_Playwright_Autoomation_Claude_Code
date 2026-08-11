import { test, expect } from '@fixtures/test.fixture';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import { RestBook } from '@api/models/book.model';
import { HTTP_200_OK, HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN } from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { parseResponse } from '@utils/parse.response.utils';
import { getRandomUniqueFragment } from '@utils/random.data.utils';

// GET /books returns RestBook items: unlike the single-item Book schema, the collection's authors
// are RestAuthor (firstName/lastName only, no id) and the cover field is coverUrl (string), not
// coverId (int64). See docs/scenarios/api/books-get-schema.scenario.md for the full contract
// finding. Every test seeds the book (and its author) it asserts on, so the suite is independent
// of whatever data happens to exist in the target environment.

test.describe('GET /books - positive scenarios', { tag: ['@api', '@books', '@smoke'] }, () => {
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

  test('should return the full book collection matching the RestBook contract (POS-BOOKS-GET-001)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);

    const books = await booksApiSteps.getBooks();

    expect(books.length).toBeGreaterThanOrEqual(1);
    const match = books.find((item) => item.id === book.id);
    expect(match, 'the seeded book must be present in the collection').toBeDefined();
    expect(match?.title).toBe(book.title);
    expect(match?.authors.length).toBeGreaterThan(0);
  });

  test('should filter books by title substring case-insensitively (POS-BOOKS-GET-002)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const uniqueSuffix = getRandomUniqueFragment();
    const book = await booksApiSteps.createBook(
      getRandomBookOverridePayload({ authors: [author.id], title: `Test Book ${uniqueSuffix}` }),
    );
    createdBookIds.push(book.id);
    const titleFilter = uniqueSuffix.slice(0, 6).toLowerCase();

    const books = await booksApiSteps.getBooks({ title: titleFilter });

    const nonMatching = books.filter((item) => !item.title.toLowerCase().includes(titleFilter));
    expect(nonMatching, 'every returned book must match the title filter').toEqual([]);
    expect(books.map((item) => item.id)).toContain(book.id);
  });

  test('should filter books by an author firstName match (POS-BOOKS-GET-003)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);
    const firstNameFilter = author.firstName.slice(0, 6).toLowerCase();

    const books = await booksApiSteps.getBooks({ author: firstNameFilter });

    const nonMatching = books.filter(
      (item) => !item.authors.some((entry) => entry.firstName.toLowerCase().includes(firstNameFilter)),
    );
    expect(nonMatching, 'every returned book must have an author matching the firstName filter').toEqual([]);
    expect(books.map((item) => item.id)).toContain(book.id);
  });

  test('should filter books by an author lastName match (POS-BOOKS-GET-004)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);
    const lastNameFilter = author.lastName.slice(0, 6).toLowerCase();

    const books = await booksApiSteps.getBooks({ author: lastNameFilter });

    const nonMatching = books.filter(
      (item) => !item.authors.some((entry) => entry.lastName.toLowerCase().includes(lastNameFilter)),
    );
    expect(nonMatching, 'every returned book must have an author matching the lastName filter').toEqual([]);
    expect(books.map((item) => item.id)).toContain(book.id);
  });

  test('should filter books by title and author combined (POS-BOOKS-GET-005)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const uniqueSuffix = getRandomUniqueFragment();
    const book = await booksApiSteps.createBook(
      getRandomBookOverridePayload({ authors: [author.id], title: `Test Book ${uniqueSuffix}` }),
    );
    createdBookIds.push(book.id);
    const titleFilter = uniqueSuffix.slice(0, 6).toLowerCase();
    const authorFilter = author.lastName.slice(0, 6).toLowerCase();

    const books = await booksApiSteps.getBooks({ title: titleFilter, author: authorFilter });

    for (const item of books) {
      expect(item.title.toLowerCase()).toContain(titleFilter);
      const matchesAuthor = item.authors.some(
        (entry) => entry.firstName.toLowerCase().includes(authorFilter) || entry.lastName.toLowerCase().includes(authorFilter),
      );
      expect(matchesAuthor).toBeTruthy();
    }
    const matches = books.filter((item) => item.id === book.id);
    expect(matches).toHaveLength(1);
  });

  test('should return an empty array when the title filter matches no book (POS-BOOKS-GET-006)', async ({
    booksApiSteps,
  }) => {
    const books = await booksApiSteps.getBooks({ title: `zzzznonexistent${getRandomUniqueFragment()}zzzz` });

    expect(books, 'a non-matching filter must return an empty array, not a 404').toEqual([]);
  });

  test('should be accessible without an Authorization header (POS-BOOKS-GET-007)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);

    const response = await booksApiRequest.getBooks();

    expect(response.status(), 'no security scheme is declared, so anonymous access must succeed').toBe(HTTP_200_OK);
    expect(response.status()).not.toBe(HTTP_401_UNAUTHORIZED);
    expect(response.status()).not.toBe(HTTP_403_FORBIDDEN);
    expect(response.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const books = await parseResponse<RestBook[]>(response);
    expect(books.some((item) => item.id === book.id)).toBeTruthy();
  });

  test('should make a newly created book retrievable with the RestBook/RestAuthor contract with no author id (POS-BOOKS-GET-008)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const uniqueSuffix = getRandomUniqueFragment();
    const payload = getRandomBookOverridePayload({ authors: [author.id], title: `Test Book ${uniqueSuffix}` });
    const book = await booksApiSteps.createBook(payload);
    createdBookIds.push(book.id);

    const books = await booksApiSteps.getBooks({ title: uniqueSuffix });
    const match = books.find((item) => item.id === book.id);

    expect(match).toBeDefined();
    expect(match?.title).toBe(payload.title);
    expect(match?.year).toBe(payload.year);
    expect(match?.price).toBe(payload.price);
    expect(match?.available).toBe(payload.available);

    const authorMatch = match?.authors.find(
      (entry) => entry.firstName === author.firstName && entry.lastName === author.lastName,
    );
    expect(authorMatch, 'the seeded author must be represented in the authors array').toBeDefined();
    expect(authorMatch).not.toHaveProperty('id');
  });

  test('should return all authors for a multi-author book (POS-BOOKS-GET-009)', async ({
    authorsApiSteps,
    booksApiSteps,
  }) => {
    const authorOne = await authorsApiSteps.createAuthor();
    const authorTwo = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(authorOne.id, authorTwo.id);
    const uniqueSuffix = getRandomUniqueFragment();
    const book = await booksApiSteps.createBook(
      getRandomBookOverridePayload({ authors: [authorOne.id, authorTwo.id], title: `Test Book ${uniqueSuffix}` }),
    );
    createdBookIds.push(book.id);

    const books = await booksApiSteps.getBooks({ title: uniqueSuffix });
    const match = books.find((item) => item.id === book.id);

    expect(match).toBeDefined();
    expect(match?.authors).toHaveLength(2);

    const names = match?.authors.map((entry) => `${entry.firstName}|${entry.lastName}`) ?? [];
    expect(names).toContain(`${authorOne.firstName}|${authorOne.lastName}`);
    expect(names).toContain(`${authorTwo.firstName}|${authorTwo.lastName}`);
    expect(new Set(names).size).toBe(2);
  });
});
