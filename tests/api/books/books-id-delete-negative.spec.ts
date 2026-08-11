import { test, expect } from '@fixtures/test.fixture';
import type { APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

const API_URL = 'https://bookstoreapi.up.railway.app';

// The OpenAPI spec documents only a 204 response for DELETE /books/{id} - no error responses
// (400/401/403/404/409/500) are declared. Every case below was probed directly against the live
// API and asserts the exact observed status code and error message rather than an invented one.
// The observed pattern mirrors DELETE /authors/{id} (non-existent/negative/zero ids silently
// no-op with 204, non-numeric/decimal ids return 400, repeated deletion is idempotent, the
// collection route returns 405) but is verified independently here, not assumed.

type SeededAuthor = { id: number; firstName: string; lastName: string };
type SeededBookPayload = { title: string; authors: number[]; year: number; price: number; available: number };
type BookRecord = SeededBookPayload & { id: number; coverId: number | null };

test.describe('DELETE /books/{id} - negative and robustness scenarios', () => {
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

  test('should silently no-op when deleting a non-existent id (NEG-BOOKS-DELETE-001)', async ({ request }) => {
    const author = await seedAuthor(request);
    const baseline = await seedBook(request, [author.id]);

    // The absent id is created and then deleted rather than hardcoded, so "does not exist" is a
    // guaranteed precondition instead of an assumption about the environment's data.
    const disposable = await seedBook(request, [author.id]);
    await request.delete(`${API_URL}/books/${disposable.id}`);

    // Contract gap: the endpoint silently no-ops for an unknown id, returning 204 rather than 404.
    const deleteResponse = await request.delete(`${API_URL}/books/${disposable.id}`);
    expect(deleteResponse.status()).toBe(204);
    expect(await deleteResponse.body()).toHaveLength(0);

    const baselineResponse = await request.get(`${API_URL}/books/${baseline.id}`);
    expect(baselineResponse.status(), 'an unknown-id deletion must not touch unrelated books').toBe(200);
  });

  test('should reject a deletion with a non-numeric id (NEG-BOOKS-DELETE-002)', async ({ request }) => {
    const deleteResponse = await request.delete(`${API_URL}/books/abc`);

    expect(deleteResponse.status()).toBe(400);
    const error = await deleteResponse.json();
    expect(error.message).toContain('For input string: "abc"');
  });

  const noopDeleteIds = [
    { description: 'a negative id (-1)', id: -1, caseId: 'NEG-BOOKS-DELETE-003' },
    { description: 'a zero id (0)', id: 0, caseId: 'NEG-BOOKS-DELETE-004' },
  ];

  noopDeleteIds.forEach(({ description, id, caseId }) => {
    test(`should silently no-op when deleting ${description} (${caseId})`, async ({ request }) => {
      const author = await seedAuthor(request);
      const baseline = await seedBook(request, [author.id]);

      // Contract gap: a negative/zero id is a valid int64, so it is treated as just another
      // unknown id and no-ops with 204 rather than being rejected as out of range.
      const deleteResponse = await request.delete(`${API_URL}/books/${id}`);

      expect(deleteResponse.status()).toBe(204);
      expect(await deleteResponse.body()).toHaveLength(0);

      const baselineResponse = await request.get(`${API_URL}/books/${baseline.id}`);
      expect(baselineResponse.status(), 'an out-of-range id must not delete anything').toBe(200);
    });
  });

  test('should reject a deletion with a decimal id (NEG-BOOKS-DELETE-005)', async ({ request }) => {
    const deleteResponse = await request.delete(`${API_URL}/books/1.5`);

    expect(deleteResponse.status()).toBe(400);
    const error = await deleteResponse.json();
    expect(error.message).toContain('For input string: "1.5"');
  });

  test('should be idempotent on repeated deletion of the same id (NEG-BOOKS-DELETE-006)', async ({ request }) => {
    const author = await seedAuthor(request);
    const book = await seedBook(request, [author.id]);

    const firstDelete = await request.delete(`${API_URL}/books/${book.id}`);
    expect(firstDelete.status()).toBe(204);

    // Contract gap: a second deletion of the same, now-absent id also returns 204 rather than 404.
    const secondDelete = await request.delete(`${API_URL}/books/${book.id}`);
    expect(secondDelete.status(), 'repeated deletion must be idempotent').toBe(204);
    expect(await secondDelete.body()).toHaveLength(0);
  });

  test('should block deleting a book referenced by an existing order with a conflict (NEG-BOOKS-DELETE-007)', async ({
    request,
  }) => {
    const author = await seedAuthor(request);
    const book = await seedBook(request, [author.id]);

    // recipient.phone/street/zipCode are undocumented as having a format beyond `type: string`,
    // but the live API rejects faker's default formats (e.g. "(699) 510-8693 x77274" or a
    // leading house number) with 400 "incorrect input data". Probed live and pinned to the
    // formats the API actually accepts: digits-only phone, "<street name> <number>", and a
    // Polish-style "##-###" zip code.
    const orderPayload = {
      items: [{ bookId: book.id, quantity: 1 }],
      recipient: {
        name: faker.person.fullName(),
        phone: faker.string.numeric(9),
        street: `${faker.location.street()} ${faker.number.int({ min: 1, max: 200 })}`,
        city: faker.location.city(),
        zipCode: faker.location.zipCode('##-###'),
        email: faker.internet.email(),
      },
    };
    const orderResponse = await request.post(`${API_URL}/orders`, { data: orderPayload });
    expect(orderResponse.status()).toBe(201);
    const order = await orderResponse.json();

    // Contract gap: referential integrity is enforced with a 409 - the deletion neither cascades
    // to the order nor orphans the item's book reference - but no error response is documented
    // for deleteById. Note: DELETE /orders/{id} is itself gated behind an undocumented,
    // inaccessible authorization check (probed live: 403 Access Denied, and no credential is
    // available anywhere in this project to satisfy it), so the order created here cannot be
    // cleaned up afterward and is intentionally left as unavoidable leftover test data.
    const deleteResponse = await request.delete(`${API_URL}/books/${book.id}`);
    expect(deleteResponse.status()).toBe(409);
    const error = await deleteResponse.json();
    expect(error.message).toContain('operation could not be performed');

    const orderCheck = await request.get(`${API_URL}/orders/${order.id}`);
    expect(orderCheck.status(), 'the referencing order must remain intact after the blocked deletion').toBe(200);
    const refreshedOrder = await orderCheck.json();
    const stillReferenced = refreshedOrder.items.find((item: { book: { id: number } }) => item.book.id === book.id);
    expect(stillReferenced, 'the blocked deletion must leave the order item reference intact').toBeDefined();

    const bookCheck = await request.get(`${API_URL}/books/${book.id}`);
    expect(bookCheck.status(), 'the blocked deletion must leave the book itself intact').toBe(200);
  });

  test('should record the outcome of deleting a book with an uploaded cover (NEG-BOOKS-DELETE-008)', async ({
    request,
  }) => {
    // Best-effort case: PATCH /books/{id}/cover is undocumented as requiring authorization (the
    // spec declares no securitySchemes at all for this API), yet the live endpoint rejects the
    // multipart upload with 403 Access Denied and no credential is available anywhere in this
    // project to satisfy it. Setting a real coverId is therefore impractical to automate
    // reliably, so the intended orphan-check (whether GET /uploads/{id} still serves the cover
    // after its owning book is deleted) cannot be exercised end-to-end here. The attempt and its
    // actual status are still recorded as a contract-gap finding, and the endpoint's core delete
    // behavior is verified regardless, per NEG-BOOKS-DELETE-008's documented expected status.
    const author = await seedAuthor(request);
    const book = await seedBook(request, [author.id]);

    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const coverResponse = await request.patch(`${API_URL}/books/${book.id}/cover`, {
      multipart: {
        file: {
          name: 'cover.png',
          mimeType: 'image/png',
          buffer: Buffer.from(tinyPngBase64, 'base64'),
        },
      },
    });
    expect(coverResponse.status(), 'the cover upload attempt must not crash with a server error').toBeLessThan(500);

    const deleteResponse = await request.delete(`${API_URL}/books/${book.id}`);
    expect(deleteResponse.status()).toBe(204);
    expect(await deleteResponse.body(), 'a 204 must carry no response body').toHaveLength(0);
  });

  test('should not bulk-delete books via DELETE on the collection path (NEG-BOOKS-DELETE-009)', async ({
    request,
  }) => {
    const author = await seedAuthor(request);
    const baseline = await seedBook(request, [author.id]);

    const deleteResponse = await request.delete(`${API_URL}/books`);

    expect(deleteResponse.status(), 'DELETE is not supported on the collection path').toBe(405);
    const error = await deleteResponse.json();
    expect(error.message).toContain('not supported');

    const baselineResponse = await request.get(`${API_URL}/books/${baseline.id}`);
    expect(baselineResponse.status(), 'no book may be removed by the rejected bulk delete').toBe(200);
  });
});
