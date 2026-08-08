import { test, expect } from '@fixtures/test.fixture';
import { AuthorResponse, AuthorSchema, AuthorsCollectionSchema } from '@api/models/author.model';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { HTTP_200_OK } from '@api/consts/http.status.codes.const';
import { parseResponse } from '@utils/parse.response.utils';
import { getRandomNonExistingName } from '@utils/random.data.utils';

// Contract validation for GET /authors (docs/scenarios/api/authors-get-schema.scenario.md).
//
// The `Author` component declares no `required` array, so strictly per the spec none of the fields
// is guaranteed. The live API always returns all three, so AuthorSchema treats them as required
// and as a strict object - deliberately tighter than the document, so that both a missing `id` and
// an undocumented extra field (e.g. an accidentally exposed credential) fail loudly. The
// contract-gap itself is recorded in the Notes section of the scenario file.

test.describe('GET /authors - schema and contract validation', { tag: ['@api', '@authors', '@regression'] }, () => {
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ authorsApiSteps }) => {
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  test('should return 200 with a JSON array body (SCHEMA-AUTHORS-GET-001)', async ({ authorsApiRequest }) => {
    const response = await authorsApiRequest.getAuthors();

    expect(response.status()).toBe(HTTP_200_OK);

    const body = await parseResponse<AuthorResponse[]>(response);
    expect(Array.isArray(body), 'the documented response type is a raw array').toBe(true);
  });

  test('should return a top-level array of Author objects (SCHEMA-AUTHORS-GET-002)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const seeded = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(seeded.id);

    const response = await authorsApiRequest.getAuthors();
    const body = await parseResponse<AuthorResponse[]>(response);

    expect(Array.isArray(body), 'no pagination wrapper is documented for this endpoint').toBe(true);
    const nonObjects = body.filter((item) => typeof item !== 'object' || item === null || Array.isArray(item));
    expect(nonObjects, 'every array element must be a JSON object').toEqual([]);
  });

  test('should return Author items matching the documented field types (SCHEMA-AUTHORS-GET-003)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const seeded = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(seeded.id);

    const response = await authorsApiRequest.getAuthors();
    const body = await parseResponse<AuthorResponse[]>(response);

    const result = AuthorsCollectionSchema.safeParse(body);
    expect(result.success, `Author field types violate the contract: ${JSON.stringify(result.error?.issues)}`).toBe(
      true,
    );
    expect(body.length, 'at least the seeded author must be validated').toBeGreaterThanOrEqual(1);
  });

  test('should not expose fields beyond the documented Author schema (SCHEMA-AUTHORS-GET-004)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const seeded = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(seeded.id);

    const response = await authorsApiRequest.getAuthors();
    const body = await parseResponse<AuthorResponse[]>(response);

    const documentedFields = Object.keys(AuthorSchema.shape);
    const undocumentedFields = body.flatMap((author) =>
      Object.keys(author).filter((key) => !documentedFields.includes(key)),
    );
    expect(
      [...new Set(undocumentedFields)],
      'GET /authors must expose only id, firstName and lastName - anything else risks data exposure',
    ).toEqual([]);
  });

  test('should serve the response as JSON (SCHEMA-AUTHORS-GET-005)', async ({ authorsApiRequest }) => {
    const response = await authorsApiRequest.getAuthors();

    const contentType = response.headers()['content-type'];
    expect(contentType, 'a Content-Type header must be present').toBeDefined();
    // The spec declares a wildcard media type; the live API commits to JSON, which is pinned here.
    expect(contentType).toContain(CONTENT_TYPE_JSON);
    await expect(parseResponse<AuthorResponse[]>(response), 'the body must be JSON-parseable').resolves.toBeDefined();
  });

  test('should return a schema-valid empty array when nothing matches (SCHEMA-AUTHORS-GET-006)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.getAuthors({ firstName: getRandomNonExistingName() });

    expect(response.status(), 'an empty result set is a 200, not a 404').toBe(HTTP_200_OK);

    const body = await parseResponse<AuthorResponse[]>(response);
    expect(body, 'an empty result must be [] and never null').toEqual([]);
    expect(AuthorsCollectionSchema.safeParse(body).success).toBe(true);
  });
});
