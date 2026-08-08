import { test, expect } from '@fixtures/test.fixture';
import { getRandomAuthorPayload } from '@api/factories/author.factory';
import { HTTP_400_BAD_REQUEST } from '@api/consts/http.status.codes.const';
import { parseResponse } from '@utils/parse.response.utils';

// NOTE: CreateAuthorPayload declares firstName/lastName as optional (no `required` array in the
// OpenAPI schema). The running API, however, rejects requests where either field is missing with
// a 400 Bad Request ("<field> incorrect input data"). POS-AUTHORS-POST-002/003/004 assert this
// actual observed behavior rather than the documented-but-unenforced optional schema — a
// contract-gap deviation between the spec and the live API.

test.describe('POST /authors - positive scenarios', { tag: ['@api', '@authors', '@smoke'] }, () => {
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ authorsApiSteps }) => {
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  test('should create an author with both firstName and lastName (POS-AUTHORS-POST-001)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    expect(typeof created).toBe('object');
    expect(created).not.toBeNull();

    const authors = await authorsApiSteps.getAuthors({ firstName: created.firstName });
    const match = authors.find((author) => author.id === created.id);

    expect(match).toBeDefined();
    expect(match?.firstName).toBe(created.firstName);
    expect(match?.lastName).toBe(created.lastName);
  });

  test('should reject a payload with only firstName provided despite the optional schema (POS-AUTHORS-POST-002)', async ({
    authorsApiRequest,
  }) => {
    const { firstName } = getRandomAuthorPayload();

    const createResponse = await authorsApiRequest.createAuthor({ firstName });

    expect(createResponse.status()).toBe(HTTP_400_BAD_REQUEST);

    const body = await parseResponse<unknown>(createResponse);
    expect(typeof body).toBe('object');
  });

  test('should reject a payload with only lastName provided despite the optional schema (POS-AUTHORS-POST-003)', async ({
    authorsApiRequest,
  }) => {
    const { lastName } = getRandomAuthorPayload();

    const createResponse = await authorsApiRequest.createAuthor({ lastName });

    expect(createResponse.status()).toBe(HTTP_400_BAD_REQUEST);

    const body = await parseResponse<unknown>(createResponse);
    expect(typeof body).toBe('object');
  });

  test('should reject an empty payload despite the optional schema (POS-AUTHORS-POST-004)', async ({
    authorsApiRequest,
  }) => {
    const createResponse = await authorsApiRequest.createAuthor({});

    expect(createResponse.status()).toBe(HTTP_400_BAD_REQUEST);

    const body = await parseResponse<unknown>(createResponse);
    expect(typeof body).toBe('object');
  });

  test('should make a created author retrievable via GET /authors with a matching id (POS-AUTHORS-POST-005)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const authors = await authorsApiSteps.getAuthors({ firstName: created.firstName });
    expect(Array.isArray(authors)).toBeTruthy();

    const match = authors.find((author) => author.id === created.id);
    expect(match).toBeDefined();
    expect(match?.firstName).toBe(created.firstName);
    expect(match?.lastName).toBe(created.lastName);
    expect(match?.id).toBe(created.id);
  });

  test('should allow creating two authors with identical firstName/lastName (POS-AUTHORS-POST-006)', async ({
    authorsApiSteps,
  }) => {
    const payload = getRandomAuthorPayload();

    const firstAuthor = await authorsApiSteps.createAuthor(payload);
    createdAuthorIds.push(firstAuthor.id);

    const secondAuthor = await authorsApiSteps.createAuthor(payload);
    createdAuthorIds.push(secondAuthor.id);

    expect(firstAuthor.id).not.toBe(secondAuthor.id);

    const authors = await authorsApiSteps.getAuthors({ firstName: payload.firstName, lastName: payload.lastName });
    const matches = authors.filter((author) => author.id === firstAuthor.id || author.id === secondAuthor.id);
    expect(matches).toHaveLength(2);
  });

  test('should create an author without an Authorization header (POS-AUTHORS-POST-007)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    expect(typeof created).toBe('object');
    expect(created).not.toBeNull();
  });
});
