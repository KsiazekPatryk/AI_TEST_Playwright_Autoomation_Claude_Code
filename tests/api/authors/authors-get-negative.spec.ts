import { test, expect } from '@fixtures/test.fixture';

const API_URL = 'https://bookstoreapi.up.railway.app';

// The OpenAPI spec documents only a 200 response for GET /authors — no error
// responses are defined. These tests capture actual API behavior for
// undocumented/malformed input rather than asserting invented status codes.
// A 5xx response is always flagged as a robustness defect.

test.describe('GET /authors - negative and robustness scenarios', () => {
  test('NEG-AUTHORS-GET-001: handles an excessively long firstName value', async ({ request }) => {
    const longFirstName = 'a'.repeat(5000);

    const response = await request.get(`${API_URL}/authors`, {
      params: { firstName: longFirstName },
    });

    expect(response.status()).toBeLessThan(500);

    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('NEG-AUTHORS-GET-002: handles injection-style characters in firstName and lastName', async ({ request }) => {
    const response = await request.get(`${API_URL}/authors`, {
      params: {
        firstName: "' OR '1'='1",
        lastName: '<script>alert(1)</script>',
      },
    });

    expect(response.status()).toBeLessThan(500);

    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body)).toBeTruthy();

      // Injection-style values are treated as literal filter values, not bypassed,
      // so no author's name is expected to contain them.
      expect(body).toHaveLength(0);
    }
  });

  test('NEG-AUTHORS-GET-003: handles a duplicated query parameter with conflicting values', async ({ request }) => {
    const response = await request.get(`${API_URL}/authors?firstName=Alice&firstName=Bob`);

    expect(response.status()).toBeLessThan(500);

    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('NEG-AUTHORS-GET-004: ignores an unknown/undocumented query parameter', async ({ request }) => {
    const response = await request.get(`${API_URL}/authors`, {
      params: { sortBy: 'firstName' },
    });

    expect(response.status()).toBeLessThan(500);

    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('firstName');
      expect(body[0]).toHaveProperty('lastName');
    }
  });

  test('NEG-AUTHORS-GET-005: handles a malformed URL-encoded query value', async ({ request }) => {
    const response = await request.get(`${API_URL}/authors?firstName=%zz`);

    expect(response.status()).toBeLessThan(500);

    const contentType = response.headers()['content-type'] ?? '';
    if (contentType.includes('application/json')) {
      const body = await response.json();
      expect(body).toBeTruthy();
    }
  });
});
