import { test as base } from '@playwright/test';
import { HomePage } from '@ui/pages/home.page';

type Pages = {
  homePage: HomePage;
};

export const test = base.extend<Pages>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
});

export { expect } from '@playwright/test';
