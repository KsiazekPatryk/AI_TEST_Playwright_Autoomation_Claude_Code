import { test, expect } from '@fixtures/test.fixture';
import { createAuthorFormData } from '@ui/factories/author.factory';
import { AuthorFormData } from '@ui/models/author.model';

test.describe('Authors management — add new author', { tag: ['@ui', '@authors'] }, () => {
  let author: AuthorFormData;

  test.beforeEach(() => {
    author = createAuthorFormData();
  });

  test('should add a new author and show it in the authors grid', async ({ homePage, authorsPage }) => {
    // Arrange
    await homePage.goto();
    await homePage.navbar.goToAuthors();

    await authorsPage.waitForUrl();
    await expect(authorsPage.heading).toBeVisible();
    // The grid loads asynchronously after the heading renders.
    await expect(authorsPage.authorGrid.cards.first()).toBeVisible();
    const baselineCount = await authorsPage.navbar.getAuthorsCount();

    // Act
    await authorsPage.addAuthor(author);

    // Assert
    await expect(authorsPage.successToast).toBeVisible();

    const newAuthorCard = authorsPage.authorGrid.cardByFullName(author.fullName);
    await expect(authorsPage.authorGrid.cardsByFullName(author.fullName)).toHaveCount(1);
    await expect(newAuthorCard.heading).toHaveText(author.fullName);
    await expect(newAuthorCard.id).toHaveText(/^ID: \d+$/);

    await test.step('the author persists after a reload and the nav counter grows', async () => {
      // The "Authors (N)" counter only refreshes on navigation, and the reload also proves the
      // author was stored server-side rather than only in local UI state.
      await authorsPage.goto();

      await expect
        .poll(() => authorsPage.navbar.getAuthorsCount(), {
          message: 'author count in the navbar should grow after adding an author',
        })
        .toBeGreaterThan(baselineCount);

      await expect(newAuthorCard.heading).toHaveText(author.fullName);
      await expect(newAuthorCard.id).toHaveText(/^ID: \d+$/);
    });
  });

  test('should filter the grid to the matching author when searching by last name', async ({ authorsPage }) => {
    // Arrange — a freshly added author with a unique last name
    await authorsPage.goto();
    await expect(authorsPage.authorGrid.cards.first()).toBeVisible();
    await authorsPage.addAuthor(author);
    await expect(authorsPage.authorGrid.cardsByFullName(author.fullName)).toHaveCount(1);

    // Act — search matches first name OR last name as separate fields, not the concatenated name.
    await authorsPage.searchByName(author.lastName);

    // Assert — the grid shrinks to the single matching author
    await expect(authorsPage.authorGrid.cards).toHaveCount(1);
    await expect(authorsPage.authorGrid.cardByFullName(author.fullName).heading).toBeVisible();
    await expect(authorsPage.noAuthorsFoundMessage).toBeHidden();
  });
});
