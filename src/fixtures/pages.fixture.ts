import { test as base } from '@playwright/test';
import { HomePage } from '@ui/pages/home.page';
import { AuthorsPage } from '@ui/pages/authors.page';
import { BooksManagementPage } from '@ui/pages/books-management.page';

type Pages = {
  homePage: HomePage;
  authorsPage: AuthorsPage;
  booksManagementPage: BooksManagementPage;
};

export const test = base.extend<Pages>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  authorsPage: async ({ page }, use) => {
    await use(new AuthorsPage(page));
  },
  booksManagementPage: async ({ page }, use) => {
    await use(new BooksManagementPage(page));
  },
});

export { expect } from '@playwright/test';
