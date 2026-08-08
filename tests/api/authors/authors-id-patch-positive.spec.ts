import { test, expect } from '@fixtures/test.fixture';
import { AuthorSchema } from '@api/models/author.model';
import { HTTP_200_OK } from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { parseResponse } from '@utils/parse.response.utils';

// Unlike PUT /authors/{id}, the live API for PATCH /authors/{id} behaves consistently with the
// documented partial-update contract: single-field payloads, both-field payloads and an empty `{}`
// body are all accepted with 200 and applied as true partial updates (unspecified fields are left
// unchanged). Every PATCH response is validated against AuthorSchema - a strict object - so an
// undocumented or sensitive extra field fails the contract instead of being silently ignored.

test.describe('PATCH /authors/{id} - positive scenarios', { tag: ['@api', '@authors', '@smoke'] }, () => {
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ authorsApiSteps }) => {
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  test('should partially update only firstName, leaving lastName unchanged (POS-AUTHORS-PATCH-001)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, { firstName: 'PatchedFirst' });

    expect(patchResponse.status()).toBe(HTTP_200_OK);
    expect(patchResponse.headers()['content-type']).toContain(CONTENT_TYPE_JSON);
    const result = AuthorSchema.safeParse(await parseResponse<unknown>(patchResponse));
    expect(result.success, `PATCH response violates the Author contract: ${JSON.stringify(result.error?.issues)}`).toBe(
      true,
    );
    expect(result.data).toEqual({ id: created.id, firstName: 'PatchedFirst', lastName: created.lastName });

    const author = await authorsApiSteps.getAuthorById(created.id);
    expect(author, 'an unspecified field must not be cleared by a partial update').toEqual({
      id: created.id,
      firstName: 'PatchedFirst',
      lastName: created.lastName,
    });
  });

  test('should partially update only lastName, leaving firstName unchanged (POS-AUTHORS-PATCH-002)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, { lastName: 'PatchedLast' });

    expect(patchResponse.status()).toBe(HTTP_200_OK);
    expect(patchResponse.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const author = await authorsApiSteps.getAuthorById(created.id);
    expect(author, 'an unspecified field must not be cleared by a partial update').toEqual({
      id: created.id,
      firstName: created.firstName,
      lastName: 'PatchedLast',
    });
  });

  test('should update both firstName and lastName in a single request (POS-AUTHORS-PATCH-003)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, {
      firstName: 'BothUpdatedFirst',
      lastName: 'BothUpdatedLast',
    });

    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const author = await authorsApiSteps.getAuthorById(created.id);
    expect(author).toEqual({ id: created.id, firstName: 'BothUpdatedFirst', lastName: 'BothUpdatedLast' });
  });

  test('should accept an empty body as a no-op and leave the author unchanged (POS-AUTHORS-PATCH-004)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, {});

    expect(patchResponse.status(), 'an empty partial update is a documented no-op, not a 400').toBe(HTTP_200_OK);

    const author = await authorsApiSteps.getAuthorById(created.id);
    expect(author).toEqual(created);
  });

  test('should converge to the same state after repeated identical partial updates (POS-AUTHORS-PATCH-005)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const payload = { firstName: 'IdempotentFirst' };
    const expectedAuthor = { id: created.id, firstName: 'IdempotentFirst', lastName: created.lastName };

    const firstPatch = await authorsApiRequest.updateAuthorPartially(created.id, payload);
    expect(firstPatch.status()).toBe(HTTP_200_OK);
    expect(await parseResponse<unknown>(firstPatch)).toEqual(expectedAuthor);

    const secondPatch = await authorsApiRequest.updateAuthorPartially(created.id, payload);
    expect(secondPatch.status()).toBe(HTTP_200_OK);
    expect(await parseResponse<unknown>(secondPatch), 'repeated identical patches must converge').toEqual(
      expectedAuthor,
    );

    const author = await authorsApiSteps.getAuthorById(created.id);
    expect(author).toEqual(expectedAuthor);
  });

  test('should update an author without an Authorization header (POS-AUTHORS-PATCH-006)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    // The spec declares no securitySchemes, so the endpoint must succeed with no credential at
    // all. Pinned explicitly so that introducing auth breaks this test.
    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, { firstName: 'NoAuthPatch' });

    expect(patchResponse.status(), 'PATCH /authors/{id} is unauthenticated - revisit if security is added').toBe(
      HTTP_200_OK,
    );
    expect(patchResponse.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const result = AuthorSchema.safeParse(await parseResponse<unknown>(patchResponse));
    expect(result.success, `PATCH response violates the Author contract: ${JSON.stringify(result.error?.issues)}`).toBe(
      true,
    );
    expect(result.data).toEqual({ id: created.id, firstName: 'NoAuthPatch', lastName: created.lastName });
  });

  test('should reflect a patched author in GET /authors with a matching filter (POS-AUTHORS-PATCH-007)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, {
      firstName: 'ConsistencyCheckFirst',
    });
    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const authors = await authorsApiSteps.getAuthors({ firstName: 'ConsistencyCheckFirst' });
    const match = authors.find((author) => author.id === created.id);

    expect(match, 'the patched author must be reachable through the updated filter value').toBeDefined();
    expect(match).toEqual({ id: created.id, firstName: 'ConsistencyCheckFirst', lastName: created.lastName });
  });
});
