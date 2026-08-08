import { test, expect } from '@fixtures/test.fixture';
import { HTTP_200_OK, HTTP_500_INTERNAL_SERVER_ERROR } from '@api/consts/http.status.codes.const';
import { parseResponse } from '@utils/parse.response.utils';

// The OpenAPI spec documents only a 200 response for GET /authors — no error
// responses are defined. These tests capture actual API behavior for
// undocumented/malformed input rather than asserting invented status codes.
// A 5xx response is always flagged as a robustness defect.

test.describe('GET /authors - negative and robustness scenarios', { tag: ['@api', '@authors', '@regression'] }, () => {
  test('should handle an excessively long firstName value without a server error (NEG-AUTHORS-GET-001)', async ({
    authorsApiRequest,
  }) => {
    const longFirstName = 'a'.repeat(5000);

    const response = await authorsApiRequest.getAuthors({ firstName: longFirstName });

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_200_OK) {
      const body = await parseResponse<unknown[]>(response);
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('should handle injection-style characters in firstName and lastName (NEG-AUTHORS-GET-002)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.getAuthors({
      firstName: "' OR '1'='1",
      lastName: '<script>alert(1)</script>',
    });

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_200_OK) {
      const body = await parseResponse<unknown[]>(response);
      expect(Array.isArray(body)).toBeTruthy();

      // Injection-style values are treated as literal filter values, not bypassed,
      // so no author's name is expected to contain them.
      expect(body).toHaveLength(0);
    }
  });

  test('should handle a duplicated query parameter with conflicting values (NEG-AUTHORS-GET-003)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.getAuthorsByRawQuery('?firstName=Alice&firstName=Bob');

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_200_OK) {
      const body = await parseResponse<unknown[]>(response);
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('should ignore an unknown/undocumented query parameter (NEG-AUTHORS-GET-004)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.getAuthors({ sortBy: 'firstName' });

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    if (response.status() === HTTP_200_OK) {
      const body = await parseResponse<Array<{ firstName: string; lastName: string }>>(response);
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('firstName');
      expect(body[0]).toHaveProperty('lastName');
    }
  });

  test('should handle a malformed URL-encoded query value (NEG-AUTHORS-GET-005)', async ({ authorsApiRequest }) => {
    const response = await authorsApiRequest.getAuthorsByRawQuery('?firstName=%zz');

    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);

    const contentType = response.headers()['content-type'] ?? '';
    if (contentType.includes('application/json')) {
      const body = await parseResponse<unknown>(response);
      expect(body).toBeTruthy();
    }
  });
});
