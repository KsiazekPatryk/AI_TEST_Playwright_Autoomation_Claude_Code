import { test, expect } from '@fixtures/test.fixture';
import { faker } from '@faker-js/faker';

const API_URL = 'https://bookstoreapi.up.railway.app';

// The OpenAPI spec documents only a 200 response for PUT /authors/{id} — no error responses
// (400, 401, 403, 404, 415, 500) are declared, including no documented 404 for a non-existent id.
// These tests capture actual API behavior for undocumented/malformed input rather than asserting
// invented status codes. A 5xx response is always flagged as a robustness defect.

// The live API also rejects firstName/lastName values containing characters outside [A-Za-z]
// (observed 400 "incorrect input data" for apostrophes, digits, etc. that faker person names can
// occasionally include). Setup authors are seeded with sanitized names to keep tests deterministic.
const sanitizedName = (value: string): string => value.replace(/[^a-zA-Z]/g, '') || 'Test';

test.describe('PUT /authors/{id} - negative and robustness scenarios', () => {
  test('NEG-AUTHORS-PUT-001: attempting to update a non-existent id does not silently succeed', async ({
    request,
  }) => {
    const nonExistentId = 999999999;

    const updateResponse = await request.put(`${API_URL}/authors/${nonExistentId}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 'Ghost', lastName: 'Writer' },
    });

    expect(updateResponse.status()).not.toBe(200);
    expect(updateResponse.status()).toBeLessThan(500);

    const getResponse = await request.get(`${API_URL}/authors/${nonExistentId}`);
    expect(getResponse.status()).not.toBe(200);
  });

  test('NEG-AUTHORS-PUT-002: attempting to update using a non-numeric id is handled gracefully', async ({
    request,
  }) => {
    const updateResponse = await request.put(`${API_URL}/authors/abc`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 'Charlotte', lastName: 'Bronte' },
    });

    expect(updateResponse.status()).not.toBe(200);
    expect(updateResponse.status()).toBeLessThan(500);
  });

  test('NEG-AUTHORS-PUT-003: attempting to update using a negative id does not succeed', async ({ request }) => {
    const updateResponse = await request.put(`${API_URL}/authors/-1`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 'Charlotte', lastName: 'Bronte' },
    });

    expect(updateResponse.status()).not.toBe(200);
    expect(updateResponse.status()).toBeLessThan(500);
  });

  test('NEG-AUTHORS-PUT-004: attempting to update using a decimal id is handled gracefully', async ({ request }) => {
    const updateResponse = await request.put(`${API_URL}/authors/1.5`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 'Charlotte', lastName: 'Bronte' },
    });

    expect(updateResponse.status()).not.toBe(200);
    expect(updateResponse.status()).toBeLessThan(500);
  });

  test('NEG-AUTHORS-PUT-005: rejects a request with no body sent, and leaves the author unchanged', async ({
    request,
  }) => {
    const firstName = sanitizedName(faker.person.firstName());
    const lastName = sanitizedName(faker.person.lastName());
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName, lastName },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(updateResponse.status()).not.toBe(200);
    expect(updateResponse.status()).toBeLessThan(500);

    const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
    expect(getResponse.status()).toBe(200);
    const author = await getResponse.json();
    expect(author.firstName).toBe(firstName);
    expect(author.lastName).toBe(lastName);

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('NEG-AUTHORS-PUT-006: handles malformed JSON syntax and leaves the author unchanged', async ({ request }) => {
    const firstName = sanitizedName(faker.person.firstName());
    const lastName = sanitizedName(faker.person.lastName());
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName, lastName },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: '{ "firstName": "Jane", "lastName": }',
    });
    expect(updateResponse.status()).not.toBe(200);
    expect(updateResponse.status()).toBeLessThan(500);

    const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
    expect(getResponse.status()).toBe(200);
    const author = await getResponse.json();
    expect(author.firstName).toBe(firstName);
    expect(author.lastName).toBe(lastName);

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('NEG-AUTHORS-PUT-007: handles firstName sent as an integer instead of a string', async ({ request }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 12345, lastName: 'Austen' },
    });
    expect(updateResponse.status()).toBeLessThan(500);

    if (updateResponse.status() === 200) {
      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      const author = await getResponse.json();
      expect(author.firstName).toBeDefined();
    }

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('NEG-AUTHORS-PUT-008: handles lastName sent as an array instead of a string', async ({ request }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 'Jane', lastName: ['Austen'] },
    });
    expect(updateResponse.status()).toBeLessThan(500);

    if (updateResponse.status() === 200) {
      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      const author = await getResponse.json();
      expect(author.lastName).toBeDefined();
    }

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('NEG-AUTHORS-PUT-009: ignores client-supplied id and undocumented fields', async ({ request }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 'Jane', lastName: 'Austen', id: 999, createdAt: '2020-01-01' },
    });
    expect(updateResponse.status()).toBeLessThan(500);

    if (updateResponse.status() === 200) {
      const updated = await updateResponse.json();
      expect(updated.id).toBe(created.id);
      expect(updated.id).not.toBe(999);
      expect(updated.createdAt).toBeUndefined();

      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      const author = await getResponse.json();
      expect(author.id).toBe(created.id);
      expect(author.createdAt).toBeUndefined();
    }

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('NEG-AUTHORS-PUT-010: handles an excessively long firstName value', async ({ request }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const longFirstName = 'a'.repeat(5000);

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: longFirstName, lastName: 'Bronte' },
    });
    expect(updateResponse.status()).toBeLessThan(500);

    if (updateResponse.status() === 200) {
      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      const author = await getResponse.json();
      expect(author.firstName).toBe(longFirstName);
    }

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('NEG-AUTHORS-PUT-011: handles injection-style characters in firstName and lastName', async ({ request }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: "' OR '1'='1", lastName: '<script>alert(1)</script>' },
    });
    expect(updateResponse.status()).toBeLessThan(500);

    if (updateResponse.status() === 200) {
      const updated = await updateResponse.json();
      expect(updated.firstName).toBe("' OR '1'='1");
      expect(updated.lastName).toBe('<script>alert(1)</script>');
    }

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('NEG-AUTHORS-PUT-012: handles an unsupported Content-Type header', async ({ request }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'text/plain' },
      data: '{ "firstName": "Jane", "lastName": "Austen" }',
    });
    expect(updateResponse.status()).not.toBe(200);
    expect(updateResponse.status()).toBeLessThan(500);

    await request.delete(`${API_URL}/authors/${created.id}`);
  });
});
