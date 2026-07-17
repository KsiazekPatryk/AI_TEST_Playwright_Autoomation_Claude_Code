import { test, expect } from '@fixtures/test.fixture';

const TOTAL_BOOKS_COUNT = 29;
const UNRELATED_TITLES = [
  'Java Puzzlers',
  'Java Concurrency in Practice',
  'Thinking in Java',
  'Functional Programming in Java',
];

test.describe('Home page — book search', { tag: ['@ui', '@search'] }, () => {
  test('searching for "Effective Java" filters the catalog to the exact matching book', async ({ homePage }) => {
    // Arrange
    await homePage.goto();
    await expect(homePage.heading).toBeVisible();
    await expect(homePage.searchInput).toBeVisible();
    await expect(homePage.bookGrid.cards).toHaveCount(TOTAL_BOOKS_COUNT);

    // Act
    await homePage.searchFor('Effective Java');

    // Assert — exactly one matching book remains
    await expect(homePage.bookGrid.cards).toHaveCount(1);

    const effectiveJavaCard = homePage.bookGrid.cardByTitle('Effective Java');
    await expect(effectiveJavaCard.title('Effective Java')).toBeVisible();
    await expect(effectiveJavaCard.author('Joshua Bloch')).toBeVisible();
    await expect(effectiveJavaCard.year('2008')).toBeVisible();
    await expect(effectiveJavaCard.price('$107.28')).toBeVisible();
    await expect(effectiveJavaCard.stock('100')).toBeVisible();

    for (const unrelatedTitle of UNRELATED_TITLES) {
      await expect(homePage.bookGrid.headingByTitle(unrelatedTitle)).not.toBeVisible();
    }

    // Act — clear the search
    await homePage.clearSearch();

    // Assert — full catalog is restored
    await expect(homePage.bookGrid.cards).toHaveCount(TOTAL_BOOKS_COUNT);
  });
});
