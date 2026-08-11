import { test, expect } from '@fixtures/test.fixture';
import type { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

const API_URL = 'https://bookstoreapi.up.railway.app';

// DELETE /books/{id} (deleteById) documents only a 204 No Content response with no body. Every
// test below seeds its own fresh author + book so deletion stays independent and repeatable;
// created ids are registered for afterEach cleanup before any assertion can throw, so a failing
// assertion can never leak test data (mirrors tests/api/authors/authors-id-delete-positive.spec.ts).

type SeededAuthor = { id: number; firstName: string; lastName: string };
type SeededBookPayload = { title: string; authors: number[]; year: number; price: number; available: number };
type BookRecord = SeededBookPayload & { id: number; coverId: number | null };

test.describe('DELETE /books/{id} - positive scenarios', () => {
  const createdBookIds: number[] = [];
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ request }) => {
    for (const id of createdBookIds.splice(0, createdBookIds.length)) {
      await request.delete(`${API_URL}/books/${id}`);
    }
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await request.delete(`${API_URL}/authors/${id}`);
    }
  });

  async function seedAuthor(request: APIRequestContext): Promise<SeededAuthor> {
    const payload = {
      firstName: `${faker.person.firstName()}${faker.string.alpha(6)}`,
      lastName: `${faker.person.lastName()}${faker.string.alpha(6)}`,
    };
    const response = await request.post(`${API_URL}/authors`, { data: payload });
    expect(response.status()).toBe(201);
    const author = await response.json();
    createdAuthorIds.push(author.id);
    return author;
  }

  async function seedBook(
    request: APIRequestContext,
    authorIds: number[],
    overrides: Partial<SeededBookPayload> = {},
  ): Promise<BookRecord> {
    const payload: SeededBookPayload = {
      title: overrides.title ?? `Test Book ${faker.string.alphanumeric(10)}`,
      authors: overrides.authors ?? authorIds,
      year: overrides.year ?? faker.number.int({ min: 1990, max: 2023 }),
      price: overrides.price ?? faker.number.float({ min: 1, max: 500, fractionDigits: 2 }),
      available: overrides.available ?? faker.number.int({ min: 1, max: 100 }),
    };
    const response = await request.post(`${API_URL}/books`, { data: payload });
    expect(response.status()).toBe(201);
    const book = await response.json();
    createdBookIds.push(book.id);
    return book;
  }

  test('should delete an existing book with no order associations (POS-BOOKS-DELETE-001)', async ({ request }) => {
    const author = await seedAuthor(request);
    const book = await seedBook(request, [author.id]);

    const deleteResponse = await request.delete(`${API_URL}/books/${book.id}`);

    expect(deleteResponse.status()).toBe(204);
    expect(await deleteResponse.body(), 'a 204 must carry no response body').toHaveLength(0);

    const listResponse = await request.get(`${API_URL}/books`, { params: { title: book.title } });
    const remaining = await listResponse.json();
    expect(
      remaining.find((item: { id: number }) => item.id === book.id),
      'the deleted book must no longer be listed',
    ).toBeUndefined();
  });

  test('should return 404 on a follow-up GET for a deleted book (POS-BOOKS-DELETE-002)', async ({ request }) => {
    const author = await seedAuthor(request);
    const book = await seedBook(request, [author.id]);

    const deleteResponse = await request.delete(`${API_URL}/books/${book.id}`);
    expect(deleteResponse.status()).toBe(204);

    // Contract gap: getById documents only a 200 response. The live API returns 404 for a
    // now-deleted id, which is the conventionally correct REST behavior but is undocumented.
    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    expect(getResponse.status()).toBe(404);
    expect(await getResponse.body(), 'the 404 is returned with an empty body').toHaveLength(0);
  });

  test('should not affect a sibling book when deleting one book (POS-BOOKS-DELETE-003)', async ({ request }) => {
    const author = await seedAuthor(request);
    const target = await seedBook(request, [author.id]);
    const sibling = await seedBook(request, [author.id]);

    const deleteResponse = await request.delete(`${API_URL}/books/${target.id}`);
    expect(deleteResponse.status()).toBe(204);

    const siblingResponse = await request.get(`${API_URL}/books/${sibling.id}`);
    expect(siblingResponse.status(), 'an unrelated book must remain retrievable').toBe(200);
    const siblingBook = await siblingResponse.json();
    expect(siblingBook.title).toBe(sibling.title);
    expect(siblingBook.year).toBe(sibling.year);
    expect(siblingBook.price).toBe(sibling.price);
    expect(siblingBook.available).toBe(sibling.available);
  });

  test('should decrease the book collection count by exactly one after deletion (POS-BOOKS-DELETE-004)', async ({
    request,
  }) => {
    // GET /books returns the full, shared collection, and sibling spec files create and delete
    // unrelated books in parallel workers at the same time. Both books here therefore share a
    // unique generated title tag and the count is scoped to that tag via the documented title
    // filter, so "decreases by exactly one" is deterministic without serialising the file.
    const tag = `CountTag${faker.string.alphanumeric(10)}`;
    const author = await seedAuthor(request);
    const target = await seedBook(request, [author.id], { title: `${tag} Target` });
    const control = await seedBook(request, [author.id], { title: `${tag} Control` });

    const beforeResponse = await request.get(`${API_URL}/books`, { params: { title: tag } });
    const before = await beforeResponse.json();
    expect(before, 'both tagged books must be present before the deletion').toHaveLength(2);

    const deleteResponse = await request.delete(`${API_URL}/books/${target.id}`);
    expect(deleteResponse.status()).toBe(204);

    const afterResponse = await request.get(`${API_URL}/books`, { params: { title: tag } });
    const after = await afterResponse.json();
    expect(after).toHaveLength(before.length - 1);
    expect(
      after.map((item: { id: number }) => item.id),
      'only the targeted book may be removed',
    ).toEqual([control.id]);
  });

  test('should not affect the referenced author when deleting a book (POS-BOOKS-DELETE-005)', async ({ request }) => {
    // Book.authors references Author, but Author has no field referencing Book back, so deleting
    // a book has no documented reason to touch the author records it lists. Verified directly
    // rather than assumed - the inverse (undocumented) direction is covered in
    // authors-id-delete-negative.spec.ts (NEG-AUTHORS-DELETE-007).
    const author = await seedAuthor(request);
    const book = await seedBook(request, [author.id]);

    const deleteResponse = await request.delete(`${API_URL}/books/${book.id}`);
    expect(deleteResponse.status()).toBe(204);
    expect(await deleteResponse.body(), 'a 204 must carry no response body').toHaveLength(0);

    const authorResponse = await request.get(`${API_URL}/authors/${author.id}`);
    expect(authorResponse.status(), 'the referenced author must remain retrievable').toBe(200);
    const refreshedAuthor = await authorResponse.json();
    expect(refreshedAuthor.id).toBe(author.id);
    expect(refreshedAuthor.firstName).toBe(author.firstName);
    expect(refreshedAuthor.lastName).toBe(author.lastName);
  });

  test('should delete a book without an Authorization header (POS-BOOKS-DELETE-006)', async ({ request }) => {
    const author = await seedAuthor(request);
    const book = await seedBook(request, [author.id]);

    // The spec declares no securitySchemes, so the endpoint must succeed with no credential at
    // all. Pinned explicitly so that introducing auth breaks this test.
    const deleteResponse = await request.delete(`${API_URL}/books/${book.id}`, { headers: {} });

    expect(deleteResponse.status(), 'DELETE /books/{id} is unauthenticated - revisit if security is added').toBe(
      204,
    );
    expect(await deleteResponse.body()).toHaveLength(0);

    const getResponse = await request.get(`${API_URL}/books/${book.id}`);
    expect(getResponse.status(), 'the deletion must actually have taken effect').toBe(404);
  });
});
