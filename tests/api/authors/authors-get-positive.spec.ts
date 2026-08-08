import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { test, expect } from '@fixtures/test.fixture';

const AuthorSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
});

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
    const authors = await authorsApiSteps.getAuthors();

    expect(Array.isArray(authors)).toBeTruthy();
    expect(authors.length).toBeGreaterThan(0);

    const result = AuthorSchema.safeParse(authors[0]);
    expect(result.success).toBeTruthy();
  });

  test('should filter authors by firstName matching an existing author (POS-AUTHORS-GET-002)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const authors = await authorsApiSteps.getAuthors({ firstName: created.firstName });

    for (const author of authors) {
      expect(author.firstName.toLowerCase()).toContain(created.firstName.toLowerCase());
    }
    expect(authors.some((author) => author.id === created.id)).toBeTruthy();
  });

  test('should filter authors by lastName matching an existing author (POS-AUTHORS-GET-003)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const authors = await authorsApiSteps.getAuthors({ lastName: created.lastName });

    for (const author of authors) {
      expect(author.lastName.toLowerCase()).toContain(created.lastName.toLowerCase());
    }
    expect(authors.some((author) => author.id === created.id)).toBeTruthy();
  });

  test('should filter authors by firstName and lastName combined (POS-AUTHORS-GET-004)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const authors = await authorsApiSteps.getAuthors({ firstName: created.firstName, lastName: created.lastName });

    for (const author of authors) {
      expect(author.firstName.toLowerCase()).toContain(created.firstName.toLowerCase());
      expect(author.lastName.toLowerCase()).toContain(created.lastName.toLowerCase());
    }

    const matches = authors.filter((author) => author.id === created.id);
    expect(matches).toHaveLength(1);
  });

  test('should return an empty array when the filter matches no author (POS-AUTHORS-GET-005)', async ({
    authorsApiSteps,
  }) => {
    const authors = await authorsApiSteps.getAuthors({ firstName: faker.string.uuid() });

    expect(Array.isArray(authors)).toBeTruthy();
    expect(authors).toHaveLength(0);
  });

  test('should be accessible without an Authorization header (POS-AUTHORS-GET-006)', async ({ authorsApiSteps }) => {
    const authors = await authorsApiSteps.getAuthors();

    expect(Array.isArray(authors)).toBeTruthy();
  });

  test('should make a newly created author retrievable via GET /authors (POS-AUTHORS-GET-007)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const authors = await authorsApiSteps.getAuthors({ firstName: created.firstName });
    const match = authors.find((author) => author.id === created.id);

    expect(match).toBeDefined();
    expect(match?.id).not.toBeNull();
    expect(match?.firstName).toBe(created.firstName);
    expect(match?.lastName).toBe(created.lastName);
  });
});
