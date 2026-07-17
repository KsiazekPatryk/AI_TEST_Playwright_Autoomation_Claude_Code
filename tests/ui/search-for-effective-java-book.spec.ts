import { test, expect } from '@playwright/test';

test('searching for "Effective Java" filters the catalog to the exact matching book', async ({ page }) => {
  await page.goto('https://ksiegarnia.up.railway.app/');

  await expect(page.getByRole('heading', { name: 'Available Books' })).toBeVisible();

  const searchInput = page.getByPlaceholder('Search books by title or author...');
  await expect(searchInput).toBeVisible();

  const bookCards = page.locator('app-book-card');
  await expect(bookCards).toHaveCount(29);

  await searchInput.fill('Effective Java');

  await expect(bookCards).toHaveCount(1);

  const effectiveJavaCard = bookCards.filter({ hasText: 'Effective Java' });
  await expect(effectiveJavaCard.getByRole('heading', { name: 'Effective Java', exact: true })).toBeVisible();
  await expect(effectiveJavaCard.getByText('Joshua Bloch', { exact: true })).toBeVisible();
  await expect(effectiveJavaCard.getByText('2008', { exact: true })).toBeVisible();
  await expect(effectiveJavaCard.getByText('$107.28', { exact: true })).toBeVisible();
  await expect(effectiveJavaCard.getByText('In stock: 100', { exact: true })).toBeVisible();

  for (const unrelatedTitle of [
    'Java Puzzlers',
    'Java Concurrency in Practice',
    'Thinking in Java',
    'Functional Programming in Java',
  ]) {
    await expect(page.getByRole('heading', { name: unrelatedTitle, exact: true })).not.toBeVisible();
  }

  await searchInput.clear();
  await expect(bookCards).toHaveCount(29);
});
