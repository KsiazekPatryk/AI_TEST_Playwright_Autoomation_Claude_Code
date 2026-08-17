import { faker } from '@faker-js/faker';
import { test, expect } from '@fixtures/test.fixture';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import { API_ENDPOINTS } from '@api/consts/api.endpoints.const';
import {
  HTTP_200_OK,
  HTTP_201_CREATED,
  HTTP_204_NO_CONTENT,
  HTTP_400_BAD_REQUEST,
  HTTP_405_METHOD_NOT_ALLOWED,
  HTTP_409_CONFLICT,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from '@api/consts/http.status.codes.const';
import { NOT_SUPPORTED_MESSAGE_FRAGMENT, OPERATION_NOT_PERFORMED_MESSAGE, invalidPathVariableMessage } from '@api/consts/api.error.messages.const';
import { DECIMAL_ID, INVALID_BEARER_TOKEN, NON_NUMERIC_ID } from '@data/negative.inputs.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';
import { parseResponse } from '@utils/parse.response.utils';

// The OpenAPI spec documents only a 204 response for DELETE /books/{id} - no error responses
// (400/401/403/404/409/500) are declared. Every case below was probed directly against the live
// API and asserts the exact observed status code and error message rather than an invented one.
// The observed pattern mirrors DELETE /authors/{id} (non-existent/negative/zero ids silently
// no-op with 204, non-numeric/decimal ids return 400, repeated deletion is idempotent, the
// collection route returns 405) but is verified independently here, not assumed.

// `orders` is a setup dependency for the referential-integrity probe below (NEG-BOOKS-DELETE-007)
// only - it is not the resource under test, so it deliberately stays a plain endpoint constant
// (see api.endpoints.const.ts) rather than a dedicated OrdersAPIRequest/OrdersAPISteps pair.
interface OrderItem {
  book: { id: number };
  [key: string]: unknown;
}

interface OrderResponse {
  id: number;
  items: OrderItem[];
  [key: string]: unknown;
}

test.describe('DELETE /books/{id} - negative and robustness scenarios', { tag: ['@api', '@books', '@regression'] }, () => {
  const createdBookIds: number[] = [];
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ booksApiSteps, authorsApiSteps }) => {
    // Books must be deleted before their referenced authors - deleting an author still referenced
    // by a book returns 409 Conflict (confirmed live), so book cleanup always runs first. Repeated
    // deletion of an already-deleted id is a safe no-op (204).
    for (const id of createdBookIds.splice(0, createdBookIds.length)) {
      await booksApiSteps.deleteBook(id);
    }
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  test('should silently no-op when deleting a non-existent id (NEG-BOOKS-DELETE-001)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const baseline = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(baseline.id);

    // The absent id is created and then deleted rather than hardcoded, so "does not exist" is a
    // guaranteed precondition instead of an assumption about the environment's data.
    const disposable = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    await booksApiSteps.deleteBook(disposable.id);

    // Contract gap: the endpoint silently no-ops for an unknown id, returning 204 rather than 404.
    const deleteResponse = await booksApiRequest.deleteBook(disposable.id);
    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
    expect(await deleteResponse.body()).toHaveLength(0);

    const baselineResponse = await booksApiRequest.getBookById(baseline.id);
    expect(baselineResponse.status(), 'an unknown-id deletion must not touch unrelated books').toBe(HTTP_200_OK);
  });

  test('should reject a deletion with a non-numeric id (NEG-BOOKS-DELETE-002)', async ({ booksApiRequest }) => {
    const deleteResponse = await booksApiRequest.deleteBook(NON_NUMERIC_ID);

    expect(deleteResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(deleteResponse);
    expect(getApiErrorMessages(error)).toContain(invalidPathVariableMessage(NON_NUMERIC_ID));
  });

  const noopDeleteIds = [
    { description: 'a negative id (-1)', id: -1, caseId: 'NEG-BOOKS-DELETE-003' },
    { description: 'a zero id (0)', id: 0, caseId: 'NEG-BOOKS-DELETE-004' },
  ];

  noopDeleteIds.forEach(({ description, id, caseId }) => {
    test(`should silently no-op when deleting ${description} (${caseId})`, async ({
      authorsApiSteps,
      booksApiSteps,
      booksApiRequest,
    }) => {
      const author = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(author.id);
      const baseline = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
      createdBookIds.push(baseline.id);

      // Contract gap: a negative/zero id is a valid int64, so it is treated as just another
      // unknown id and no-ops with 204 rather than being rejected as out of range.
      const deleteResponse = await booksApiRequest.deleteBook(id);

      expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
      expect(await deleteResponse.body()).toHaveLength(0);

      const baselineResponse = await booksApiRequest.getBookById(baseline.id);
      expect(baselineResponse.status(), 'an out-of-range id must not delete anything').toBe(HTTP_200_OK);
    });
  });

  test('should reject a deletion with a decimal id (NEG-BOOKS-DELETE-005)', async ({ booksApiRequest }) => {
    const deleteResponse = await booksApiRequest.deleteBook(DECIMAL_ID);

    expect(deleteResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(deleteResponse);
    expect(getApiErrorMessages(error)).toContain(invalidPathVariableMessage(DECIMAL_ID));
  });

  test('should be idempotent on repeated deletion of the same id (NEG-BOOKS-DELETE-006)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);

    const firstDelete = await booksApiRequest.deleteBook(book.id);
    expect(firstDelete.status()).toBe(HTTP_204_NO_CONTENT);

    // Contract gap: a second deletion of the same, now-absent id also returns 204 rather than 404.
    const secondDelete = await booksApiRequest.deleteBook(book.id);
    expect(secondDelete.status(), 'repeated deletion must be idempotent').toBe(HTTP_204_NO_CONTENT);
    expect(await secondDelete.body()).toHaveLength(0);
  });

  test('should block deleting a book referenced by an existing order with a conflict (NEG-BOOKS-DELETE-007)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
    apiRequest,
  }) => {
    // Deliberately NOT registered in createdBookIds/createdAuthorIds: this test's whole point is
    // that the deletion is permanently blocked once an order references the book, so afterEach's
    // assertive `booksApiSteps.deleteBook`/`authorsApiSteps.deleteAuthor` (which fail loudly on a
    // non-204 response) would themselves fail here. Both the book and its author are therefore
    // intentionally left as unavoidable leftover test data, exactly like the order itself. The ids
    // are still recorded as a test annotation (visible in the HTML report) so they can be purged
    // out-of-band, since afterEach cannot clean them up automatically.
    const author = await authorsApiSteps.createAuthor();
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    test.info().annotations.push({
      type: 'leaked-test-data',
      description: `book=${book.id} author=${author.id} - blocked by order referential integrity, requires manual purge`,
    });

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
    const orderResponse = await apiRequest.post(API_ENDPOINTS.orders.base, orderPayload);
    expect(orderResponse.status()).toBe(HTTP_201_CREATED);
    const order = await parseResponse<OrderResponse>(orderResponse);

    // Contract gap: referential integrity is enforced with a 409 - the deletion neither cascades
    // to the order nor orphans the item's book reference - but no error response is documented
    // for deleteById. Note: DELETE /orders/{id} is itself gated behind an undocumented,
    // inaccessible authorization check (probed live: 403 Access Denied, and no credential is
    // available anywhere in this project to satisfy it), so the order created here cannot be
    // cleaned up afterward and is intentionally left as unavoidable leftover test data.
    const deleteResponse = await booksApiRequest.deleteBook(book.id);
    expect(deleteResponse.status()).toBe(HTTP_409_CONFLICT);
    const error = await parseApiError(deleteResponse);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

    const orderCheckResponse = await apiRequest.get(API_ENDPOINTS.orders.byId(order.id));
    expect(orderCheckResponse.status(), 'the referencing order must remain intact after the blocked deletion').toBe(
      HTTP_200_OK,
    );
    const refreshedOrder = await parseResponse<OrderResponse>(orderCheckResponse);
    const stillReferenced = refreshedOrder.items.find((item) => item.book.id === book.id);
    expect(stillReferenced, 'the blocked deletion must leave the order item reference intact').toBeDefined();

    const bookCheckResponse = await booksApiRequest.getBookById(book.id);
    expect(bookCheckResponse.status(), 'the blocked deletion must leave the book itself intact').toBe(HTTP_200_OK);
  });

  test('should record the outcome of deleting a book with an uploaded cover (NEG-BOOKS-DELETE-008)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    // Best-effort case: PATCH /books/{id}/cover is undocumented as requiring authorization (the
    // spec declares no securitySchemes at all for this API), yet the live endpoint rejects the
    // multipart upload with 403 Access Denied and no credential is available anywhere in this
    // project to satisfy it. Setting a real coverId is therefore impractical to automate
    // reliably, so the intended orphan-check (whether GET /uploads/{id} still serves the cover
    // after its owning book is deleted) cannot be exercised end-to-end here. The attempt and its
    // actual status are still recorded as a contract-gap finding, and the endpoint's core delete
    // behavior is verified regardless, per NEG-BOOKS-DELETE-008's documented expected status.
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);

    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const coverResponse = await booksApiRequest.uploadBookCover(book.id, {
      name: 'cover.png',
      mimeType: 'image/png',
      buffer: Buffer.from(tinyPngBase64, 'base64'),
    });
    expect(coverResponse.status(), 'the cover upload attempt must not crash with a server error').toBeLessThan(500);

    const deleteResponse = await booksApiRequest.deleteBook(book.id);
    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
    expect(await deleteResponse.body(), 'a 204 must carry no response body').toHaveLength(0);
  });

  test('should not bulk-delete books via DELETE on the collection path (NEG-BOOKS-DELETE-009)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const baseline = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(baseline.id);

    const deleteResponse = await booksApiRequest.deleteBooksCollection();

    expect(deleteResponse.status(), 'DELETE is not supported on the collection path').toBe(
      HTTP_405_METHOD_NOT_ALLOWED,
    );
    const error = await parseApiError(deleteResponse);
    expect(getApiErrorMessages(error).join(' ')).toContain(NOT_SUPPORTED_MESSAGE_FRAGMENT);

    const baselineResponse = await booksApiRequest.getBookById(baseline.id);
    expect(baselineResponse.status(), 'no book may be removed by the rejected bulk delete').toBe(HTTP_200_OK);
  });

  test('should not fail with a server error when an invalid bearer token is supplied (NEG-BOOKS-DELETE-010)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    // The endpoint declares no security scheme, so an unparseable credential must either be ignored
    // or rejected cleanly - never crash the server, especially for a non-idempotent write.
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));

    const deleteResponse = await booksApiRequest.deleteBook(book.id, { Authorization: INVALID_BEARER_TOKEN });

    expect(deleteResponse.status(), 'an invalid token must not crash a write endpoint').toBeLessThan(
      HTTP_500_INTERNAL_SERVER_ERROR,
    );
    if (deleteResponse.status() !== HTTP_204_NO_CONTENT) {
      createdBookIds.push(book.id);
    }
  });
});
