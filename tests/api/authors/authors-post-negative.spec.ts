import { test, expect } from '@fixtures/test.fixture';
import { getRandomAuthorOverridePayload } from '@api/factories/author.factory';
import { HTTP_201_CREATED, HTTP_500_INTERNAL_SERVER_ERROR } from '@api/consts/http.status.codes.const';
import { parseResponse } from '@utils/parse.response.utils';

// The OpenAPI spec documents only a 201 response for POST /authors — no error
// responses are defined. These tests capture actual API behavior for
// undocumented/malformed input rather than asserting invented status codes.
// A 5xx response is always flagged as a robustness defect.

test.describe('POST /authors - negative and robustness scenarios', { tag: ['@api', '@authors', '@regression'] }, () => {
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ authorsApiSteps }) => {
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  test('should reject a request with no body sent (NEG-AUTHORS-POST-001)', async ({ authorsApiRequest }) => {
    const response = await authorsApiRequest.createAuthor(undefined, { 'Content-Type': 'application/json' });

    expect(response.status()).not.toBe(HTTP_201_CREATED);
    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
  });

  test('should handle malformed JSON syntax in the request body (NEG-AUTHORS-POST-002)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.createAuthor(
      '{ "firstName": "Jane", "lastName": }',
      { 'Content-Type': 'application/json' },
    );

    expect(response.status()).not.toBe(HTTP_201_CREATED);
    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
  });

  test('should handle firstName sent as an integer instead of a string (NEG-AUTHORS-POST-003)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.createAuthor({ firstName: 12345, lastName: 'Austen' });

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_201_CREATED) {
      const created = await parseResponse<{ id?: number }>(response);
      if (created.id !== undefined) {
        createdAuthorIds.push(created.id);
      }
    }
  });

  test('should handle lastName sent as an array instead of a string (NEG-AUTHORS-POST-004)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.createAuthor({ firstName: 'Jane', lastName: ['Austen'] });

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_201_CREATED) {
      const created = await parseResponse<{ id?: number }>(response);
      if (created.id !== undefined) {
        createdAuthorIds.push(created.id);
      }
    }
  });

  test('should handle explicit null values for firstName and lastName (NEG-AUTHORS-POST-005)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.createAuthor({ firstName: null, lastName: null });

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_201_CREATED) {
      const created = await parseResponse<{ id?: number }>(response);
      if (created.id !== undefined) {
        createdAuthorIds.push(created.id);
      }
    }
  });

  test('should ignore client-supplied id and undocumented fields (NEG-AUTHORS-POST-006)', async ({
    authorsApiRequest,
  }) => {
    const payload = getRandomAuthorOverridePayload({ id: 999, middleName: 'X' });

    const response = await authorsApiRequest.createAuthor(payload);

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_201_CREATED) {
      const created = await parseResponse<{ id?: number }>(response);

      if (created.id !== undefined) {
        expect(created.id).not.toBe(999);
        createdAuthorIds.push(created.id);
      }
    }
  });

  test('should handle an excessively long firstName value (NEG-AUTHORS-POST-007)', async ({ authorsApiRequest }) => {
    const payload = getRandomAuthorOverridePayload({ firstName: 'a'.repeat(5000), lastName: 'Austen' });

    const response = await authorsApiRequest.createAuthor(payload);

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_201_CREATED) {
      const created = await parseResponse<{ id?: number }>(response);
      if (created.id !== undefined) {
        createdAuthorIds.push(created.id);
      }
    }
  });

  test('should handle injection-style characters in firstName and lastName (NEG-AUTHORS-POST-008)', async ({
    authorsApiRequest,
  }) => {
    const payload = getRandomAuthorOverridePayload({
      firstName: "' OR '1'='1",
      lastName: '<script>alert(1)</script>',
    });

    const response = await authorsApiRequest.createAuthor(payload);

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_201_CREATED) {
      const created = await parseResponse<{ id?: number; firstName?: string; lastName?: string }>(response);
      expect(created.firstName).toBe("' OR '1'='1");
      expect(created.lastName).toBe('<script>alert(1)</script>');

      if (created.id !== undefined) {
        createdAuthorIds.push(created.id);
      }
    }
  });

  test('should handle an unsupported Content-Type header (NEG-AUTHORS-POST-009)', async ({ authorsApiRequest }) => {
    const response = await authorsApiRequest.createAuthor(
      '{ "firstName": "Jane", "lastName": "Austen" }',
      { 'Content-Type': 'text/plain' },
    );

    expect(response.status()).not.toBe(HTTP_201_CREATED);
    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
  });
});
