import { test, expect } from '@fixtures/test.fixture';
import { HTTP_200_OK } from '@api/consts/http.status.codes.const';
import { parseResponse } from '@utils/parse.response.utils';

// Unlike PUT /authors/{id} (see authors-id-put-positive.spec.ts), the live API for PATCH
// /authors/{id} was probed directly and behaves consistently with the documented partial-update
// contract: single-field payloads, both-field payloads, and an empty `{}` body are all accepted
// with 200 and applied as true partial updates (unspecified fields are left unchanged).

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

    const author = await authorsApiSteps.getAuthorById(created.id);
    expect(author.firstName).toBe('PatchedFirst');
    expect(author.lastName).toBe(created.lastName);
  });

  test('should partially update only lastName, leaving firstName unchanged (POS-AUTHORS-PATCH-002)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, { lastName: 'PatchedLast' });
    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const author = await authorsApiSteps.getAuthorById(created.id);
    expect(author.lastName).toBe('PatchedLast');
    expect(author.firstName).toBe(created.firstName);
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
    expect(author.firstName).toBe('BothUpdatedFirst');
    expect(author.lastName).toBe('BothUpdatedLast');
  });

  test('should accept an empty body as a no-op and leave the author unchanged (POS-AUTHORS-PATCH-004)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, {});
    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const author = await authorsApiSteps.getAuthorById(created.id);
    expect(author.firstName).toBe(created.firstName);
    expect(author.lastName).toBe(created.lastName);
  });

  test('should converge to the same state after repeated identical partial updates (POS-AUTHORS-PATCH-005)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const payload = { firstName: 'IdempotentFirst' };

    const firstPatch = await authorsApiRequest.updateAuthorPartially(created.id, payload);
    expect(firstPatch.status()).toBe(HTTP_200_OK);

    const secondPatch = await authorsApiRequest.updateAuthorPartially(created.id, payload);
    expect(secondPatch.status()).toBe(HTTP_200_OK);

    const author = await authorsApiSteps.getAuthorById(created.id);
    expect(author.firstName).toBe('IdempotentFirst');
  });

  test('should update an author without an Authorization header (POS-AUTHORS-PATCH-006)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, { firstName: 'NoAuthPatch' });
    expect(patchResponse.status()).toBe(HTTP_200_OK);

    const updated = await parseResponse<Record<string, unknown>>(patchResponse);
    expect(typeof updated).toBe('object');
    expect(updated).not.toBeNull();
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
    expect(match).toBeDefined();
    expect(match?.firstName).toBe('ConsistencyCheckFirst');
  });
});
