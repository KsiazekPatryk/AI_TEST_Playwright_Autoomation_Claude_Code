import { test, expect } from '@fixtures/test.fixture';
import { CATALOG_SIZE, EFFECTIVE_JAVA, UNRELATED_TITLES } from '@data/books.const';

test.describe('Home page — book search', { tag: ['@ui', '@search'] }, () => {
  test('should filter the catalog to the exact matching book when searching by title', async ({ homePage }) => {
    // Arrange
    await homePage.goto();
    await expect(homePage.heading).toBeVisible();
    await expect(homePage.searchInput).toBeVisible();
    await expect(homePage.bookGrid.cards).toHaveCount(CATALOG_SIZE);

    // Act
    await homePage.searchFor(EFFECTIVE_JAVA.title);

    // Assert — exactly one matching book remains, and unrelated titles are gone
    await expect(homePage.bookGrid.cards).toHaveCount(1);
    await expect(homePage.bookGrid.cardsMatching(UNRELATED_TITLES)).toHaveCount(0);

    const effectiveJavaCard = homePage.bookGrid.cardByTitle(EFFECTIVE_JAVA.title);
    await expect(effectiveJavaCard.title(EFFECTIVE_JAVA.title)).toBeVisible();
    await expect(effectiveJavaCard.author(EFFECTIVE_JAVA.author)).toBeVisible();
    await expect(effectiveJavaCard.year(EFFECTIVE_JAVA.year)).toBeVisible();
    await expect(effectiveJavaCard.price(EFFECTIVE_JAVA.price)).toBeVisible();
    await expect(effectiveJavaCard.stock(EFFECTIVE_JAVA.stock)).toBeVisible();
  });

  test('should restore the full catalog when the search is cleared', async ({ homePage }) => {
    // Arrange — start from a filtered catalog showing a single book
    await homePage.goto();
    await homePage.searchFor(EFFECTIVE_JAVA.title);
    await expect(homePage.bookGrid.cards).toHaveCount(1);

    // Act
    await homePage.clearSearch();

    // Assert — full catalog is restored
    await expect(homePage.bookGrid.cards).toHaveCount(CATALOG_SIZE);
  });
});
