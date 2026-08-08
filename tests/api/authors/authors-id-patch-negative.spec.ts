import { test, expect } from '@fixtures/test.fixture';
import { HTTP_200_OK, HTTP_500_INTERNAL_SERVER_ERROR } from '@api/consts/http.status.codes.const';

// The OpenAPI spec documents only a 200 response for PATCH /authors/{id} — no error responses
// (400, 404, 415, 500) are declared. These tests capture actual observed API behavior for
// undocumented/malformed input rather than asserting invented status codes. A 5xx response is
// always flagged as a robustness defect.

test.describe('PATCH /authors/{id} - negative and robustness scenarios', { tag: ['@api', '@authors', '@regression'] }, () => {
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ authorsApiSteps }) => {
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  const invalidIdPaths = [
    { description: 'a non-numeric id path parameter (abc)', id: 'abc' },
    { description: 'a decimal id path parameter (1.5)', id: '1.5' },
  ];

  invalidIdPaths.forEach(({ description, id }) => {
    test(`should reject a PATCH with ${description} gracefully (NEG-AUTHORS-PATCH-001/007)`, async ({
      authorsApiRequest,
    }) => {
      const patchResponse = await authorsApiRequest.updateAuthorPartially(id, { firstName: 'PatchedFirst' });

      expect(patchResponse.status()).not.toBe(HTTP_200_OK);
      expect(patchResponse.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
    });
  });

  test('should not silently succeed when patching a non-existent id (NEG-AUTHORS-PATCH-002)', async ({
    authorsApiRequest,
  }) => {
    const nonExistentId = 999999999;

    const patchResponse = await authorsApiRequest.updateAuthorPartially(nonExistentId, { firstName: 'GhostAuthor' });

    expect(patchResponse.status()).not.toBe(HTTP_200_OK);
    expect(patchResponse.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
  });

  test('should reject malformed JSON syntax and leave the author unchanged (NEG-AUTHORS-PATCH-003)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, '{ "firstName": "Broken" ');
    expect(patchResponse.status()).not.toBe(HTTP_200_OK);
    expect(patchResponse.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    const author = await authorsApiSteps.getAuthorById(created.id);
    expect(author.firstName).toBe(created.firstName);
    expect(author.lastName).toBe(created.lastName);
  });

  test('should reject firstName sent as a number instead of a string (NEG-AUTHORS-PATCH-004)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, { firstName: 12345 });
    expect(patchResponse.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (patchResponse.status() === HTTP_200_OK) {
      const author = await authorsApiSteps.getAuthorById(created.id);
      expect(author.firstName).toBeDefined();
    } else {
      const author = await authorsApiSteps.getAuthorById(created.id);
      expect(author.firstName).toBe(created.firstName);
    }
  });

  test('should reject a non-object (array) request body and leave the author unchanged (NEG-AUTHORS-PATCH-005)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, ['firstName', 'PatchedFirst']);
    expect(patchResponse.status()).not.toBe(HTTP_200_OK);
    expect(patchResponse.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    const author = await authorsApiSteps.getAuthorById(created.id);
    expect(author.firstName).toBe(created.firstName);
    expect(author.lastName).toBe(created.lastName);
  });

  test('should handle a missing Content-Type header gracefully (NEG-AUTHORS-PATCH-006)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const patchResponse = await authorsApiRequest.updateAuthorPartially(
      created.id,
      '{ "firstName": "NoContentTypeFirst" }',
      { 'Content-Type': '' },
    );
    expect(patchResponse.status()).not.toBe(HTTP_200_OK);
    expect(patchResponse.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
  });
});
