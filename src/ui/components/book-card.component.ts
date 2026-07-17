import { Locator } from '@playwright/test';

/**
 * Represents a single `<app-book-card>` fragment within the book grid.
 * Wraps a root Locator scoped to one card so it can be reused wherever
 * book cards appear (e.g. home page catalog, search results).
 */
export class BookCardComponent {
  constructor(private readonly root: Locator) {}

  title(name: string): Locator {
    return this.root.getByRole('heading', { name, exact: true });
  }

  author(name: string): Locator {
    return this.root.getByText(name, { exact: true });
  }

  year(value: string): Locator {
    return this.root.getByText(value, { exact: true });
  }

  price(value: string): Locator {
    return this.root.getByText(value, { exact: true });
  }

  stock(quantity: string): Locator {
    return this.root.getByText(`In stock: ${quantity}`, { exact: true });
  }
}
