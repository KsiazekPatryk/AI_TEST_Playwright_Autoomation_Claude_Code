import { test, expect } from '@fixtures/test.fixture';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

const API_URL = 'https://bookstoreapi.up.railway.app';

const AuthorSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
});

test.describe('GET /authors - positive scenarios', () => {
  test('POS-AUTHORS-GET-001: returns the full author collection', async ({ request }) => {
    const response = await request.get(`${API_URL}/authors`);

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);

    const result = AuthorSchema.safeParse(body[0]);
    expect(result.success).toBeTruthy();
  });

  test('POS-AUTHORS-GET-002: filters authors by firstName matching an existing author', async ({ request }) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    const createResponse = await request.post(`${API_URL}/authors`, {
      data: { firstName, lastName },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const response = await request.get(`${API_URL}/authors`, {
      params: { firstName },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();

    for (const author of body) {
      expect(author.firstName.toLowerCase()).toContain(firstName.toLowerCase());
    }

    expect(body.some((author: { id: number }) => author.id === created.id)).toBeTruthy();

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('POS-AUTHORS-GET-003: filters authors by lastName matching an existing author', async ({ request }) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    const createResponse = await request.post(`${API_URL}/authors`, {
      data: { firstName, lastName },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const response = await request.get(`${API_URL}/authors`, {
      params: { lastName },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();

    for (const author of body) {
      expect(author.lastName.toLowerCase()).toContain(lastName.toLowerCase());
    }

    expect(body.some((author: { id: number }) => author.id === created.id)).toBeTruthy();

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('POS-AUTHORS-GET-004: filters authors by firstName and lastName combined', async ({ request }) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    const createResponse = await request.post(`${API_URL}/authors`, {
      data: { firstName, lastName },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const response = await request.get(`${API_URL}/authors`, {
      params: { firstName, lastName },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();

    for (const author of body) {
      expect(author.firstName.toLowerCase()).toContain(firstName.toLowerCase());
      expect(author.lastName.toLowerCase()).toContain(lastName.toLowerCase());
    }

    const matches = body.filter((author: { id: number }) => author.id === created.id);
    expect(matches).toHaveLength(1);

    await request.delete(`${API_URL}/authors/${created.id}`);
  });

  test('POS-AUTHORS-GET-005: returns an empty array when the filter matches no author', async ({ request }) => {
    const response = await request.get(`${API_URL}/authors`, {
      params: { firstName: faker.string.uuid() },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(Array.isArray(body)).toBeTruthy();
    expect(body).toHaveLength(0);
  });

  test('POS-AUTHORS-GET-006: is accessible without an Authorization header', async ({ request }) => {
    const response = await request.get(`${API_URL}/authors`, {
      headers: {},
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('POS-AUTHORS-GET-007: a newly created author is retrievable via GET /authors', async ({ request }) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    const createResponse = await request.post(`${API_URL}/authors`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName, lastName },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    const response = await request.get(`${API_URL}/authors`, {
      params: { firstName },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    const match = body.find((author: { id: number }) => author.id === created.id);

    expect(match).toBeDefined();
    expect(match.id).not.toBeNull();
    expect(match.firstName).toBe(firstName);
    expect(match.lastName).toBe(lastName);

    await request.delete(`${API_URL}/authors/${created.id}`);
  });
});
