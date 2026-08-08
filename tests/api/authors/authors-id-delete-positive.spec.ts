import { faker } from '@faker-js/faker';
import { test, expect } from '@fixtures/test.fixture';
import { getRandomAuthorOverridePayload } from '@api/factories/author.factory';
import { HTTP_204_NO_CONTENT, HTTP_404_NOT_FOUND } from '@api/consts/http.status.codes.const';

test.describe('DELETE /authors/{id} - positive scenarios', { tag: ['@api', '@authors', '@smoke'] }, () => {
  // POS-AUTHORS-DELETE-004 asserts an exact before/after count on the shared, global /authors
  // collection. Running this file's tests serially (rather than in parallel workers) avoids a
  // race condition where sibling tests in this same file create/delete authors concurrently and
  // perturb that count.
  test.describe.configure({ mode: 'serial' });

  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ authorsApiSteps }) => {
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  test('should delete an existing author with no book associations (POS-AUTHORS-DELETE-001)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();

    const deleteResponse = await authorsApiRequest.deleteAuthor(created.id);
    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
    const body = await deleteResponse.body();
    expect(body).toHaveLength(0);

    const authors = await authorsApiSteps.getAuthors({ firstName: created.firstName, lastName: created.lastName });
    const match = authors.find((author) => author.id === created.id);
    expect(match).toBeUndefined();
  });

  test('should record the actual observed status on a follow-up GET for a deleted author (POS-AUTHORS-DELETE-002)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();

    const deleteResponse = await authorsApiRequest.deleteAuthor(created.id);
    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);

    // getById_1 documents only a 200 response, no 404. Live API was probed directly and actually
    // returns 404 for a now-deleted id, deviating from the documented contract. Recorded here as
    // the observed behavior rather than an assumed/guessed status code.
    const getResponse = await authorsApiRequest.getAuthorById(created.id);
    expect(getResponse.status()).toBe(HTTP_404_NOT_FOUND);
  });

  test('should not affect a sibling author when deleting one author (POS-AUTHORS-DELETE-003)', async ({
    authorsApiSteps,
  }) => {
    const target = await authorsApiSteps.createAuthor();
    const sibling = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(sibling.id);

    await authorsApiSteps.deleteAuthor(target.id);

    const siblingAuthor = await authorsApiSteps.getAuthorById(sibling.id);
    expect(siblingAuthor.firstName).toBe(sibling.firstName);
    expect(siblingAuthor.lastName).toBe(sibling.lastName);
  });

  test('should decrease the author collection count by exactly one after deletion (POS-AUTHORS-DELETE-004)', async ({
    authorsApiSteps,
  }) => {
    // GET /authors returns the full, shared collection used by every API spec file in this suite,
    // which run concurrently across parallel workers. Comparing the raw global count before/after
    // would be flaky, since sibling spec files create/delete unrelated authors at the same time.
    // Instead, both authors here share a unique generated lastName tag, and the count is scoped to
    // that tag via the documented lastName filter — collisions with concurrently-running tests are
    // effectively impossible, keeping the "decreases by exactly one" assertion deterministic.
    const tagLastName = `CountTag${faker.string.alpha(10)}`;

    const target = await authorsApiSteps.createAuthor(getRandomAuthorOverridePayload({ lastName: tagLastName }));
    const control = await authorsApiSteps.createAuthor(getRandomAuthorOverridePayload({ lastName: tagLastName }));
    createdAuthorIds.push(control.id);

    const beforeAuthors = await authorsApiSteps.getAuthors({ lastName: tagLastName });
    const countBefore = beforeAuthors.length;

    await authorsApiSteps.deleteAuthor(target.id);

    const afterAuthors = await authorsApiSteps.getAuthors({ lastName: tagLastName });

    expect(afterAuthors).toHaveLength(countBefore - 1);
    const stillPresent = afterAuthors.find((author) => author.id === target.id);
    expect(stillPresent).toBeUndefined();
  });

  test('should delete an author without an Authorization header (POS-AUTHORS-DELETE-005)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();

    const deleteResponse = await authorsApiRequest.deleteAuthor(created.id);
    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
    const body = await deleteResponse.body();
    expect(body).toHaveLength(0);
  });
});
