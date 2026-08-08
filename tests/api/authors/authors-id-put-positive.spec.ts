import { test, expect } from '@fixtures/test.fixture';
import { faker } from '@faker-js/faker';

const API_URL = 'https://bookstoreapi.up.railway.app';

// NOTE: UpdateAuthorPayload declares firstName/lastName as optional (no `required` array in the
// OpenAPI schema). The running API, however, rejects PUT requests where either field is missing
// with a 400 Bad Request ("<field> incorrect input data") — the same live-API-vs-spec deviation
// already observed for POST /authors (see authors-post-positive.spec.ts). POS-AUTHORS-PUT-002,
// 003, and 004 assert this actual observed behavior rather than the documented-but-unenforced
// optional schema.

// The live API also rejects firstName/lastName values containing characters outside [A-Za-z]
// (observed 400 "incorrect input data" for apostrophes, digits, etc. that faker person names can
// occasionally include). Setup authors are seeded with sanitized names to keep tests deterministic.
const sanitizedName = (value: string): string => value.replace(/[^a-zA-Z]/g, '') || 'Test';

test.describe('PUT /authors/{id} - positive scenarios', () => {
  test('POS-AUTHORS-PUT-001: updates an existing author with both firstName and lastName', async ({ request }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 'Charlotte', lastName: 'Bronte' },
    });
    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(typeof updated).toBe('object');

    const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
    expect(getResponse.status()).toBe(200);
    const author = await getResponse.json();
    expect(author.firstName).toBe('Charlotte');
    expect(author.lastName).toBe('Bronte');
    expect(author.id).toBe(created.id);

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('POS-AUTHORS-PUT-002: only firstName provided is rejected by the live API despite the optional schema', async ({
    request,
  }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 'Emily' },
    });
    expect(updateResponse.status()).toBe(400);
    const body = await updateResponse.json();
    expect(typeof body).toBe('object');

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('POS-AUTHORS-PUT-003: only lastName provided is rejected by the live API despite the optional schema', async ({
    request,
  }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { lastName: 'Woolf' },
    });
    expect(updateResponse.status()).toBe(400);
    const body = await updateResponse.json();
    expect(typeof body).toBe('object');

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('POS-AUTHORS-PUT-004: an empty payload is rejected by the live API despite the optional schema', async ({
    request,
  }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });
    expect(updateResponse.status()).toBe(400);
    const body = await updateResponse.json();
    expect(typeof body).toBe('object');

    const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
    expect(getResponse.status()).toBe(200);

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('POS-AUTHORS-PUT-005: an updated author reflects new values on a subsequent GET', async ({ request }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 'Virginia', lastName: 'Woolf' },
    });
    expect(updateResponse.status()).toBe(200);

    const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
    expect(getResponse.status()).toBe(200);
    const author = await getResponse.json();
    expect(author.firstName).toBe('Virginia');
    expect(author.lastName).toBe('Woolf');
    expect(author.id).toBe(created.id);

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('POS-AUTHORS-PUT-006: repeated identical updates are idempotent', async ({ request }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const payload = { firstName: 'Leo', lastName: 'Tolstoy' };

    const firstUpdate = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    });
    expect(firstUpdate.status()).toBe(200);

    const secondUpdate = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    });
    expect(secondUpdate.status()).toBe(200);

    const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
    expect(getResponse.status()).toBe(200);
    const author = await getResponse.json();
    expect(author.firstName).toBe('Leo');
    expect(author.lastName).toBe('Tolstoy');

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('POS-AUTHORS-PUT-007: updates an author without an Authorization header', async ({ request }) => {
    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: sanitizedName(faker.person.firstName()), lastName: sanitizedName(faker.person.lastName()) },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 'Mark', lastName: 'Twain' },
    });
    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(typeof updated).toBe('object');
    expect(updated).not.toBeNull();

    await request.delete(`${API_URL}/authors/${created.id}`);
  });
});
