import { test, expect } from '@fixtures/test.fixture';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import { HTTP_204_NO_CONTENT, HTTP_404_NOT_FOUND } from '@api/consts/http.status.codes.const';
import { getRandomUniqueFragment } from '@utils/random.data.utils';

// DELETE /books/{id} (deleteById) documents only a 204 No Content response with no body. Every
// test below seeds its own fresh author + book so deletion stays independent and repeatable;
// created ids are registered for afterEach cleanup before any assertion can throw, so a failing
// assertion can never leak test data (mirrors tests/api/authors/authors-id-delete-positive.spec.ts).

test.describe('DELETE /books/{id} - positive scenarios', { tag: ['@api', '@books', '@smoke'] }, () => {
  const createdBookIds: number[] = [];
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ booksApiSteps, authorsApiSteps }) => {
    // Books must be deleted before their referenced authors - deleting an author still referenced
    // by a book returns 409 Conflict (confirmed live), so book cleanup always runs first. Repeated
    // deletion of an already-deleted id is a safe no-op (204), so this is safe to call
    // unconditionally regardless of whether the test itself already deleted the book.
    for (const id of createdBookIds.splice(0, createdBookIds.length)) {
      await booksApiSteps.deleteBook(id);
    }
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  test('should delete an existing book with no order associations (POS-BOOKS-DELETE-001)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);

    const deleteResponse = await booksApiRequest.deleteBook(book.id);

    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
    expect(await deleteResponse.body(), 'a 204 must carry no response body').toHaveLength(0);

    const remaining = await booksApiSteps.getBooks({ title: book.title });
    expect(
      remaining.find((item) => item.id === book.id),
      'the deleted book must no longer be listed',
    ).toBeUndefined();
  });

  test('should return 404 on a follow-up GET for a deleted book (POS-BOOKS-DELETE-002)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);

    const deleteResponse = await booksApiRequest.deleteBook(book.id);
    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);

    // Contract gap: getById documents only a 200 response. The live API returns 404 for a
    // now-deleted id, which is the conventionally correct REST behavior but is undocumented.
    const getResponse = await booksApiRequest.getBookById(book.id);
    expect(getResponse.status()).toBe(HTTP_404_NOT_FOUND);
    expect(await getResponse.body(), 'the 404 is returned with an empty body').toHaveLength(0);
  });

  test('should not affect a sibling book when deleting one book (POS-BOOKS-DELETE-003)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const target = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(target.id);
    const sibling = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(sibling.id);

    const deleteResponse = await booksApiRequest.deleteBook(target.id);
    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);

    const siblingBook = await booksApiSteps.getBookById(sibling.id);
    expect(siblingBook.title).toBe(sibling.title);
    expect(siblingBook.year).toBe(sibling.year);
    expect(siblingBook.price).toBe(sibling.price);
    expect(siblingBook.available).toBe(sibling.available);
  });

  test('should decrease the book collection count by exactly one after deletion (POS-BOOKS-DELETE-004)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    // GET /books returns the full, shared collection, and sibling spec files create and delete
    // unrelated books in parallel workers at the same time. Both books here therefore share a
    // unique generated title tag and the count is scoped to that tag via the documented title
    // filter, so "decreases by exactly one" is deterministic without serialising the file.
    const tag = `CountTag${getRandomUniqueFragment()}`;
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const target = await booksApiSteps.createBook(
      getRandomBookOverridePayload({ authors: [author.id], title: `${tag} Target` }),
    );
    createdBookIds.push(target.id);
    const control = await booksApiSteps.createBook(
      getRandomBookOverridePayload({ authors: [author.id], title: `${tag} Control` }),
    );
    createdBookIds.push(control.id);

    const before = await booksApiSteps.getBooks({ title: tag });
    expect(before, 'both tagged books must be present before the deletion').toHaveLength(2);

    const deleteResponse = await booksApiRequest.deleteBook(target.id);
    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);

    const after = await booksApiSteps.getBooks({ title: tag });
    expect(after).toHaveLength(before.length - 1);
    expect(
      after.map((item) => item.id),
      'only the targeted book may be removed',
    ).toEqual([control.id]);
  });

  test('should not affect the referenced author when deleting a book (POS-BOOKS-DELETE-005)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    // Book.authors references Author, but Author has no field referencing Book back, so deleting
    // a book has no documented reason to touch the author records it lists. Verified directly
    // rather than assumed - the inverse (undocumented) direction is covered in
    // authors-id-delete-negative.spec.ts (NEG-AUTHORS-DELETE-007).
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);

    const deleteResponse = await booksApiRequest.deleteBook(book.id);
    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
    expect(await deleteResponse.body(), 'a 204 must carry no response body').toHaveLength(0);

    const refreshedAuthor = await authorsApiSteps.getAuthorById(author.id);
    expect(refreshedAuthor.id).toBe(author.id);
    expect(refreshedAuthor.firstName).toBe(author.firstName);
    expect(refreshedAuthor.lastName).toBe(author.lastName);
  });

  test('should delete a book without an Authorization header (POS-BOOKS-DELETE-006)', async ({
    authorsApiSteps,
    booksApiSteps,
    booksApiRequest,
  }) => {
    const author = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(author.id);
    const book = await booksApiSteps.createBook(getRandomBookOverridePayload({ authors: [author.id] }));
    createdBookIds.push(book.id);

    // The spec declares no securitySchemes, so the endpoint must succeed with no credential at
    // all. Pinned explicitly so that introducing auth breaks this test.
    const deleteResponse = await booksApiRequest.deleteBook(book.id);

    expect(deleteResponse.status(), 'DELETE /books/{id} is unauthenticated - revisit if security is added').toBe(
      HTTP_204_NO_CONTENT,
    );
    expect(await deleteResponse.body()).toHaveLength(0);

    const getResponse = await booksApiRequest.getBookById(book.id);
    expect(getResponse.status(), 'the deletion must actually have taken effect').toBe(HTTP_404_NOT_FOUND);
  });
});
