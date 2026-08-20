import { test, expect } from '@fixtures/test.fixture';
import { getRandomUniqueAuthorPayload } from '@api/factories/author.factory';
import { getRandomBookOverridePayload } from '@api/factories/book.factory';
import { getRandomUniqueFragment } from '@utils/random.data.utils';
import { getFullName } from '@utils/author.name.utils';
import { runCleanups } from '@utils/cleanup.utils';
import { E2E_BOOK_TITLE_PREFIX } from '@data/books.const';
import { AuthorResponse } from '@api/models/author.model';
import { BookResponse } from '@api/models/book.model';

test.describe('E2E - edit book and add a second author', { tag: ['@e2e', '@regression', '@books'] }, () => {
  let authorA: AuthorResponse | undefined;
  let authorB: AuthorResponse | undefined;
  let book: BookResponse | undefined;

  test.afterEach(async ({ booksApiSteps, authorsApiSteps }) => {
    // Detach the state first, so nothing survives into the next test even if a delete fails.
    const bookToDelete = book;
    const authorAToDelete = authorA;
    const authorBToDelete = authorB;
    book = authorA = authorB = undefined;

    // The book must be deleted before its authors, since deleting an author still referenced by a
    // book returns 409 Conflict. Every task is attempted even if an earlier one fails - otherwise a
    // failed book delete would leak both authors into the shared environment permanently.
    await runCleanups(
      async () => {
        if (bookToDelete) await booksApiSteps.deleteBook(bookToDelete.id);
      },
      async () => {
        if (authorAToDelete) await authorsApiSteps.deleteAuthor(authorAToDelete.id);
      },
      async () => {
        if (authorBToDelete) await authorsApiSteps.deleteAuthor(authorBToDelete.id);
      },
    );
  });

  test('should add a second author to an existing book via the Edit Book modal', async ({
    booksManagementPage,
    homePage,
    authorsApiSteps,
    booksApiSteps,
  }) => {
    // Arrange (API) - unique author names: the Edit Book modal lists every author in the
    // environment and both are addressed by name in the UI.
    authorA = await authorsApiSteps.createAuthor(getRandomUniqueAuthorPayload());
    authorB = await authorsApiSteps.createAuthor(getRandomUniqueAuthorPayload());

    const bookTitle = `${E2E_BOOK_TITLE_PREFIX} ${getRandomUniqueFragment()}`;
    book = await booksApiSteps.createBook(getRandomBookOverridePayload({ title: bookTitle, authors: [authorA.id] }));

    const authorAFullName = getFullName(authorA);
    const authorBFullName = getFullName(authorB);

    // Verify Setup (API) - the book starts with exactly one author.
    const bookAfterSetup = await booksApiSteps.getBookById(book.id);
    expect(bookAfterSetup.authors, 'the book must start with a single author').toHaveLength(1);
    expect(bookAfterSetup.authors[0]).toMatchObject({
      id: authorA.id,
      firstName: authorA.firstName,
      lastName: authorA.lastName,
    });

    // Act (UI)
    await booksManagementPage.goto();
    await booksManagementPage.waitForUrl();
    await expect(booksManagementPage.heading).toBeVisible();

    await booksManagementPage.openEditBook(bookTitle);

    const editModal = booksManagementPage.editBookModal;
    await expect(editModal.heading).toBeVisible();

    // Both names must identify exactly one checklist entry, otherwise the toggle below could act on
    // an unrelated author with a similar name.
    await expect(editModal.authorRows(authorAFullName), 'author A must be unambiguous').toHaveCount(1);
    await expect(editModal.authorRows(authorBFullName), 'author B must be unambiguous').toHaveCount(1);

    // Pin the pre-state from the UI too: A already associated, B not yet.
    const authorACheckbox = editModal.authorCheckbox(authorAFullName);
    const authorBCheckbox = editModal.authorCheckbox(authorBFullName);
    await expect(authorACheckbox, 'the existing association must be pre-checked').toBeChecked();
    await expect(authorBCheckbox, 'author B must not be associated yet').not.toBeChecked();

    await editModal.toggleAuthor(authorBFullName);
    await expect(authorBCheckbox).toBeChecked();
    // Adding an author must not replace the existing association.
    await expect(authorACheckbox, 'author A must stay associated').toBeChecked();

    await editModal.submit();

    // Verify UI - the modal element stays mounted and only becomes hidden, so this also proves no
    // validation error kept the modal open.
    await expect(editModal.root, 'the modal must close after a successful update').toBeHidden();

    const bookRow = booksManagementPage.booksTable.rowByTitle(bookTitle);
    await expect(bookRow.authorsCell, 'both authors must be listed in the Authors column').toContainText(
      authorAFullName,
    );
    await expect(bookRow.authorsCell).toContainText(authorBFullName);

    await homePage.goto();
    const bookCard = homePage.bookGrid.cardByTitle(bookTitle);
    await expect(bookCard.authors, 'the public catalog byline must list both authors').toContainText(authorAFullName);
    await expect(bookCard.authors).toContainText(authorBFullName);

    // Verify API
    const updatedBook = await booksApiSteps.getBookById(book.id);
    expect(updatedBook.authors, 'the book must end up with exactly two authors').toHaveLength(2);
    expect(updatedBook.authors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: authorA.id, firstName: authorA.firstName, lastName: authorA.lastName }),
        expect.objectContaining({ id: authorB.id, firstName: authorB.firstName, lastName: authorB.lastName }),
      ]),
    );
    // PUT /books/{id} is a full replace, so every scalar must survive the author-only edit. Compared
    // against the created book rather than against re-typed literals, which would not prove that.
    expect(updatedBook, 'scalar fields must be unchanged by the author-only edit').toMatchObject({
      title: book.title,
      year: book.year,
      price: book.price,
      available: book.available,
    });
  });
});
