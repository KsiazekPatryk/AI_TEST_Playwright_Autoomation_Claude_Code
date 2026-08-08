import { faker } from '@faker-js/faker';
import { test, expect } from '@fixtures/test.fixture';
import { getRandomAuthorOverridePayload } from '@api/factories/author.factory';
import { HTTP_204_NO_CONTENT, HTTP_404_NOT_FOUND } from '@api/consts/http.status.codes.const';

// DELETE is idempotent on this API (a repeated or unknown id is a silent 204 no-op), so every
// author created here is registered for afterEach cleanup *before* any assertion can throw, even
// when the test itself deletes it. A failing assertion can therefore never leak test data.

test.describe('DELETE /authors/{id} - positive scenarios', { tag: ['@api', '@authors', '@smoke'] }, () => {
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
    createdAuthorIds.push(created.id);

    const deleteResponse = await authorsApiRequest.deleteAuthor(created.id);

    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);
    expect(await deleteResponse.body(), 'a 204 must carry no response body').toHaveLength(0);

    const authors = await authorsApiSteps.getAuthors({ firstName: created.firstName, lastName: created.lastName });
    const match = authors.find((author) => author.id === created.id);
    expect(match, 'the deleted author must no longer be listed').toBeUndefined();
  });

  test('should return 404 on a follow-up GET for a deleted author (POS-AUTHORS-DELETE-002)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    const deleteResponse = await authorsApiRequest.deleteAuthor(created.id);
    expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);

    // Contract gap: getById_1 documents only a 200 response. The live API returns 404 for a
    // now-deleted id, which is the correct REST behavior but is undocumented.
    const getResponse = await authorsApiRequest.getAuthorById(created.id);
    expect(getResponse.status()).toBe(HTTP_404_NOT_FOUND);
    expect(await getResponse.body(), 'the 404 is returned with an empty body').toHaveLength(0);
  });

  test('should not affect a sibling author when deleting one author (POS-AUTHORS-DELETE-003)', async ({
    authorsApiSteps,
  }) => {
    const target = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(target.id);
    const sibling = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(sibling.id);

    await authorsApiSteps.deleteAuthor(target.id);

    const siblingAuthor = await authorsApiSteps.getAuthorById(sibling.id);
    expect(siblingAuthor, 'deleting one author must not touch any other').toEqual(sibling);
  });

  test('should decrease the author collection count by exactly one after deletion (POS-AUTHORS-DELETE-004)', async ({
    authorsApiSteps,
  }) => {
    // GET /authors returns the full, shared collection, and sibling spec files create and delete
    // unrelated authors in parallel workers at the same time. Both authors here therefore share a
    // unique generated lastName tag and the count is scoped to that tag via the documented
    // lastName filter, so "decreases by exactly one" is deterministic without serialising the file.
    const tagLastName = `CountTag${faker.string.alpha(10)}`;

    const target = await authorsApiSteps.createAuthor(getRandomAuthorOverridePayload({ lastName: tagLastName }));
    createdAuthorIds.push(target.id);
    const control = await authorsApiSteps.createAuthor(getRandomAuthorOverridePayload({ lastName: tagLastName }));
    createdAuthorIds.push(control.id);

    const beforeAuthors = await authorsApiSteps.getAuthors({ lastName: tagLastName });
    expect(beforeAuthors, 'both tagged authors must be present before the deletion').toHaveLength(2);

    await authorsApiSteps.deleteAuthor(target.id);

    const afterAuthors = await authorsApiSteps.getAuthors({ lastName: tagLastName });
    expect(afterAuthors).toHaveLength(beforeAuthors.length - 1);
    expect(
      afterAuthors.map((author) => author.id),
      'only the targeted author may be removed',
    ).toEqual([control.id]);
  });

  test('should delete an author without an Authorization header (POS-AUTHORS-DELETE-005)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const created = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(created.id);

    // The spec declares no securitySchemes, so the endpoint must succeed with no credential at
    // all. Pinned explicitly so that introducing auth breaks this test.
    const deleteResponse = await authorsApiRequest.deleteAuthor(created.id);

    expect(deleteResponse.status(), 'DELETE /authors/{id} is unauthenticated - revisit if security is added').toBe(
      HTTP_204_NO_CONTENT,
    );
    expect(await deleteResponse.body()).toHaveLength(0);

    const getResponse = await authorsApiRequest.getAuthorById(created.id);
    expect(getResponse.status(), 'the deletion must actually have taken effect').toBe(HTTP_404_NOT_FOUND);
  });
});
