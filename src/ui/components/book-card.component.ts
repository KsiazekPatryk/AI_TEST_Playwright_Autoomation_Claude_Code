import { Locator } from '@playwright/test';

/**
 * Represents a single `<app-book-card>` fragment within the book grid.
 * Wraps a root Locator scoped to one card so it can be reused wherever
 * book cards appear (e.g. home page catalog, search results).
 */
export class BookCardComponent {
  /**
   * The card's byline paragraph. The catalog renders all of a book's authors as one comma-joined
   * string (e.g. "Rebecca Parsons, Neal Ford, Patrick Kua"), so a multi-author card is verified by
   * asserting this element *contains* each name, rather than by loosening `author()` for everyone.
   */
  readonly authors: Locator;

  constructor(private readonly root: Locator) {
    this.authors = root.locator('.book-authors');
  }

  title(name: string): Locator {
    return this.root.getByRole('heading', { name, exact: true });
  }

  /**
   * A single author's byline text, matched exactly by default so a name that is merely a prefix of
   * the rendered one cannot satisfy the assertion. Pass `{ exact: false }` only when a partial
   * match is genuinely intended — for multi-author bylines prefer `expect(card.authors)
   * .toContainText(name)`, which states that intent directly.
   */
  author(name: string, options?: { exact?: boolean }): Locator {
    return this.root.getByText(name, { exact: options?.exact ?? true });
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
