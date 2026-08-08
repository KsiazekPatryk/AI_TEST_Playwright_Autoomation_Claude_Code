import { test, expect } from '@fixtures/test.fixture';
import { AuthorResponse, AuthorSchema, AuthorsCollectionSchema } from '@api/models/author.model';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import {
  HTTP_200_OK,
  HTTP_401_UNAUTHORIZED,
  HTTP_403_FORBIDDEN,
} from '@api/consts/http.status.codes.const';
import { parseResponse } from '@utils/parse.response.utils';
import { getRandomNonExistingName } from '@utils/random.data.utils';

// Every test seeds the author it asserts on, so the suite is independent of whatever data happens
// to exist in the target environment. Filter matching semantics are undocumented in the OpenAPI
// spec; the live API was probed directly and matches case-insensitively on a substring, which the
// assertions below pin explicitly (see the Notes section of the scenario file).

test.describe('GET /authors - positive scenarios', { tag: ['@api', '@authors', '@smoke'] }, () => {
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ authorsApiSteps }) => {
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  test('should return the full author collection matching the documented schema (POS-AUTHORS-GET-001)', async ({
    authorsApiSteps,
  }) => {
    const seeded = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(seeded.id);

    const authors = await authorsApiSteps.getAuthors();

    const result = AuthorsCollectionSchema.safeParse(authors);
    expect(
      result.success,
      `GET /authors response violates the Author contract: ${JSON.stringify(result.error?.issues)}`,
    ).toBe(true);
    expect(authors.length, 'collection must contain at least the seeded author').toBeGreaterThanOrEqual(1);
    expect(authors.map((author) => author.id)).toContain(seeded.id);
  });

  test('should filter authors by firstName matching an existing author (POS-AUTHORS-GET-002)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);
    const partialLowerCaseFilter = created.firstName.slice(0, 3).toLowerCase();

    const authors = await authorsApiSteps.getAuthors({ firstName: partialLowerCaseFilter });

    const nonMatching = authors.filter((author) => !author.firstName.toLowerCase().includes(partialLowerCaseFilter));
    expect(nonMatching, 'every returned author must match the firstName filter').toEqual([]);
    expect(
      authors.map((author) => author.id),
      'firstName filtering is case-insensitive substring matching',
    ).toContain(created.id);
  });

  test('should filter authors by lastName matching an existing author (POS-AUTHORS-GET-003)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);
    const partialLowerCaseFilter = created.lastName.slice(0, 3).toLowerCase();

    const authors = await authorsApiSteps.getAuthors({ lastName: partialLowerCaseFilter });

    const nonMatching = authors.filter((author) => !author.lastName.toLowerCase().includes(partialLowerCaseFilter));
    expect(nonMatching, 'every returned author must match the lastName filter').toEqual([]);
    expect(
      authors.map((author) => author.id),
      'lastName filtering is case-insensitive substring matching',
    ).toContain(created.id);
  });

  test('should filter authors by firstName and lastName combined (POS-AUTHORS-GET-004)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);
    const firstNameFilter = created.firstName.toLowerCase();
    const lastNameFilter = created.lastName.toLowerCase();

    const authors = await authorsApiSteps.getAuthors({ firstName: created.firstName, lastName: created.lastName });

    const nonMatching = authors.filter(
      (author) =>
        !author.firstName.toLowerCase().includes(firstNameFilter) ||
        !author.lastName.toLowerCase().includes(lastNameFilter),
    );
    expect(nonMatching, 'every returned author must satisfy both filters simultaneously').toEqual([]);
    expect(
      authors.filter((author) => author.id === created.id),
      'the seeded author must be present exactly once',
    ).toHaveLength(1);
  });

  test('should return an empty array when the filter matches no author (POS-AUTHORS-GET-005)', async ({
    authorsApiSteps,
  }) => {
    const authors = await authorsApiSteps.getAuthors({ firstName: getRandomNonExistingName() });

    expect(authors, 'a non-matching filter must return an empty array, not a 404').toEqual([]);
  });

  test('should be accessible without an Authorization header (POS-AUTHORS-GET-006)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const seeded = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(seeded.id);

    const response = await authorsApiRequest.getAuthors();

    expect(response.status(), 'no security scheme is declared, so anonymous access must succeed').toBe(HTTP_200_OK);
    expect(response.status()).not.toBe(HTTP_401_UNAUTHORIZED);
    expect(response.status()).not.toBe(HTTP_403_FORBIDDEN);
    expect(response.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const authors = await parseResponse<AuthorResponse[]>(response);
    expect(authors.map((author) => author.id)).toContain(seeded.id);
  });

  test('should make a newly created author retrievable via GET /authors (POS-AUTHORS-GET-007)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const authors = await authorsApiSteps.getAuthors({ firstName: created.firstName });
    const match = authors.find((author) => author.id === created.id);

    expect(match, `created author ${created.id} must be retrievable via GET /authors`).toBeDefined();
    expect(match?.id).toBe(created.id);
    expect(match?.firstName).toBe(created.firstName);
    expect(match?.lastName).toBe(created.lastName);
    expect(
      AuthorSchema.safeParse(match).success,
      'the retrieved author must expose exactly the documented fields',
    ).toBe(true);
  });
});
