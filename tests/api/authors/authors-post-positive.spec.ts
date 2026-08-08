import { test, expect } from '@fixtures/test.fixture';
import { getRandomAuthorPayload } from '@api/factories/author.factory';
import { AuthorSchema } from '@api/models/author.model';
import { HTTP_201_CREATED, HTTP_400_BAD_REQUEST } from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { incorrectInputDataMessage } from '@api/consts/api.error.messages.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';
import { parseResponse } from '@utils/parse.response.utils';

// CONTRACT DEVIATION (probed against the live API): CreateAuthorPayload declares firstName and
// lastName as optional (no `required` array in the OpenAPI schema), but the running API rejects a
// payload missing either field - including `{}` - with 400 and a per-field
// "<field> incorrect input data" message. POS-AUTHORS-POST-002/003/004 therefore assert the actual
// 400 behavior; the deviation is recorded in docs/scenarios/api/authors-post-positive.scenario.md
// so the scenario file and these tests stay in agreement.
//
// Response bodies are validated against AuthorSchema (a strict object) by AuthorsAPISteps, so an
// undocumented or sensitive extra field fails the contract instead of being silently ignored.

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
    const payload = getRandomAuthorPayload();

    const created = await authorsApiSteps.createAuthor(payload);
    createdAuthorIds.push(created.id);

    expect(created).toMatchObject({ firstName: payload.firstName, lastName: payload.lastName });

    const authors = await authorsApiSteps.getAuthors({ firstName: created.firstName });
    const match = authors.find((author) => author.id === created.id);

    expect(match, 'the created author must be retrievable via GET /authors').toBeDefined();
    expect(match).toMatchObject({ firstName: created.firstName, lastName: created.lastName });
  });

  test('should reject a payload with only firstName provided despite the optional schema (POS-AUTHORS-POST-002)', async ({
    authorsApiRequest,
  }) => {
    const { firstName } = getRandomAuthorPayload();

    const createResponse = await authorsApiRequest.createAuthor({ firstName });

    expect(createResponse.status(), 'the live API requires lastName despite the optional schema').toBe(
      HTTP_400_BAD_REQUEST,
    );
    const error = await parseApiError(createResponse);
    expect(error.status).toBe(HTTP_400_BAD_REQUEST);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('lastName'));
  });

  test('should reject a payload with only lastName provided despite the optional schema (POS-AUTHORS-POST-003)', async ({
    authorsApiRequest,
  }) => {
    const { lastName } = getRandomAuthorPayload();

    const createResponse = await authorsApiRequest.createAuthor({ lastName });

    expect(createResponse.status(), 'the live API requires firstName despite the optional schema').toBe(
      HTTP_400_BAD_REQUEST,
    );
    const error = await parseApiError(createResponse);
    expect(error.status).toBe(HTTP_400_BAD_REQUEST);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('firstName'));
  });

  test('should reject an empty payload despite the optional schema (POS-AUTHORS-POST-004)', async ({
    authorsApiRequest,
  }) => {
    const createResponse = await authorsApiRequest.createAuthor({});

    expect(createResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(createResponse);
    expect(getApiErrorMessages(error), 'both missing fields must be reported').toEqual(
      expect.arrayContaining([incorrectInputDataMessage('firstName'), incorrectInputDataMessage('lastName')]),
    );
  });

  test('should make a created author retrievable via GET /authors with a matching id (POS-AUTHORS-POST-005)', async ({
    authorsApiSteps,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const authors = await authorsApiSteps.getAuthors({ firstName: created.firstName });

    const match = authors.find((author) => author.id === created.id);
    expect(match, 'the created author must appear in the filtered collection').toBeDefined();
    expect(match).toEqual({ id: created.id, firstName: created.firstName, lastName: created.lastName });
  });

  test('should allow creating two authors with identical firstName/lastName (POS-AUTHORS-POST-006)', async ({
    authorsApiSteps,
  }) => {
    const payload = getRandomAuthorPayload();

    const firstAuthor = await authorsApiSteps.createAuthor(payload);
    createdAuthorIds.push(firstAuthor.id);

    const secondAuthor = await authorsApiSteps.createAuthor(payload);
    createdAuthorIds.push(secondAuthor.id);

    expect(secondAuthor.id, 'no uniqueness constraint is documented on the name fields').not.toBe(firstAuthor.id);

    const authors = await authorsApiSteps.getAuthors({ firstName: payload.firstName, lastName: payload.lastName });
    const matches = authors.filter((author) => author.id === firstAuthor.id || author.id === secondAuthor.id);
    expect(matches, 'both duplicates must persist independently').toHaveLength(2);
  });

  test('should create an author without an Authorization header (POS-AUTHORS-POST-007)', async ({
    authorsApiRequest,
  }) => {
    const payload = getRandomAuthorPayload();

    // The spec declares no securitySchemes and no security requirement, so the endpoint must
    // succeed with no credential at all. Pinned explicitly so that introducing auth breaks here.
    const response = await authorsApiRequest.createAuthor(payload);

    expect(response.status(), 'POST /authors is unauthenticated - revisit if security is added').toBe(
      HTTP_201_CREATED,
    );
    expect(response.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const result = AuthorSchema.safeParse(await parseResponse<unknown>(response));
    expect(result.success, `response violates the Author contract: ${JSON.stringify(result.error?.issues)}`).toBe(true);

    const created = result.data!;
    createdAuthorIds.push(created.id);
    expect(created).toMatchObject({ firstName: payload.firstName, lastName: payload.lastName });
  });
});
