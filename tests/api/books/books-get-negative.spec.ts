import { test, expect } from '@fixtures/test.fixture';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import { RestBook, RestBooksCollectionSchema } from '@api/models/book.model';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { HTTP_200_OK, HTTP_500_INTERNAL_SERVER_ERROR } from '@api/consts/http.status.codes.const';
import {
  DUPLICATED_TITLE_QUERY,
  INVALID_BEARER_TOKEN,
  MALFORMED_TITLE_QUERY,
  OVERSIZED_NAME,
  SQL_INJECTION_VALUE,
  XSS_INJECTION_VALUE,
} from '@data/negative.inputs.const';
import { parseResponse } from '@utils/parse.response.utils';

// The OpenAPI spec documents only a 200 response for GET /books - no error responses are defined.
// Each test below captures the actually observed behavior against the live API rather than
// asserting an invented status code. A 5xx response is always flagged as a robustness defect.

test.describe('GET /books - negative and robustness scenarios', { tag: ['@api', '@books', '@regression'] }, () => {
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

  test('should handle an excessively long title value without a server error (NEG-BOOKS-GET-001)', async ({
    booksApiRequest,
  }) => {
    const response = await booksApiRequest.getBooks({ title: OVERSIZED_NAME });

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_200_OK) {
      const body = await parseResponse<RestBook[]>(response);
      expect(RestBooksCollectionSchema.safeParse(body).success).toBe(true);
      // Observed live behavior: an oversized filter value matches nothing rather than erroring.
      expect(body).toHaveLength(0);
    }
  });

  test('should handle injection-style characters in title and author (NEG-BOOKS-GET-002)', async ({
    booksApiRequest,
  }) => {
    const response = await booksApiRequest.getBooks({ title: SQL_INJECTION_VALUE, author: XSS_INJECTION_VALUE });

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_200_OK) {
      const body = await parseResponse<RestBook[]>(response);
      expect(RestBooksCollectionSchema.safeParse(body).success).toBe(true);
      // Injection-style values are treated as literal filter values, not bypassed - no book
      // title/author is expected to contain them.
      expect(body).toHaveLength(0);
    }
  });

  test('should handle a duplicated title query parameter with conflicting values (NEG-BOOKS-GET-003)', async ({
    booksApiRequest,
  }) => {
    const response = await booksApiRequest.getBooksByRawQuery(DUPLICATED_TITLE_QUERY);

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_200_OK) {
      const body = await parseResponse<RestBook[]>(response);
      expect(RestBooksCollectionSchema.safeParse(body).success).toBe(true);
    }
  });

  test('should ignore unknown/undocumented query parameters (NEG-BOOKS-GET-004)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);

    // sortBy/page are not documented for this endpoint - an undocumented parameter must be ignored.
    const response = await booksApiRequest.getBooks({ sortBy: 'price', page: 0 });

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
    expect(response.status()).toBe(HTTP_200_OK);

    const body = await parseResponse<RestBook[]>(response);
    expect(RestBooksCollectionSchema.safeParse(body).success).toBe(true);
    expect(body.some((item) => item.id === book.id)).toBeTruthy();
  });

  test('should handle a malformed URL-encoded query value without an ungraceful failure (NEG-BOOKS-GET-005)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);

    const response = await booksApiRequest.getBooksByRawQuery(MALFORMED_TITLE_QUERY);

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    const contentType = response.headers()['content-type'] ?? '';
    if (contentType.includes(CONTENT_TYPE_JSON)) {
      const body = await parseResponse<RestBook[]>(response);
      expect(RestBooksCollectionSchema.safeParse(body).success).toBe(true);
      // Contract gap: the malformed filter is silently ignored and the full unfiltered collection
      // is returned instead of a 400 - the seeded book comes back even though its title is not "%zz".
      expect(body.some((item) => item.id === book.id)).toBeTruthy();
    }
  });

  test('should not fail with a server error when an invalid bearer token is supplied (NEG-BOOKS-GET-006)', async ({
    booksApiRequest,
  }) => {
    // KNOWN DEFECT (expected failure): the endpoint declares no security scheme, so an unparseable
    // credential must either be ignored (200) or rejected cleanly (401). The live API instead
    // returns 500 {"message":"Invalid token"}, reproducing the same defect class already documented
    // for GET /authors (NEG-AUTHORS-GET-006). Marked with test.fail() so the defect stays visible
    // and this test turns red the moment it is fixed.
    test.fail();

    const response = await booksApiRequest.getBooks(undefined, { Authorization: INVALID_BEARER_TOKEN });

    expect(response.status(), 'an invalid token must not crash a public endpoint').toBeLessThan(
      HTTP_500_INTERNAL_SERVER_ERROR,
    );
  });

  test('should treat an author numeric id as a literal name substring, not an ID lookup (NEG-BOOKS-GET-007)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);

    const response = await booksApiRequest.getBooks({ author: String(author.id) });

    expect(response.status()).toBe(HTTP_200_OK);

    const body = await parseResponse<RestBook[]>(response);
    expect(RestBooksCollectionSchema.safeParse(body).success).toBe(true);
    // The seeded author's name contains only letters (see getRandomFirstName/getRandomLastName), so
    // its numeric id can never appear as a substring of it - the seeded book must not be returned
    // via an id-based lookup.
    expect(body.some((item) => item.id === book.id)).toBeFalsy();
  });
});
