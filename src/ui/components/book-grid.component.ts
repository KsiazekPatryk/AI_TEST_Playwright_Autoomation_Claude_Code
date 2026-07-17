import { Page, Locator } from '@playwright/test';
import { BookCardComponent } from '@ui/components/book-card.component';

/**
 * Represents the grid/list of `<app-book-card>` elements shown on the
 * catalog. Reusable wherever the book grid fragment appears.
 */
export class BookGridComponent {
  readonly cards: Locator;

  constructor(private readonly page: Page) {
    // `app-book-card` is a custom element with no ARIA role of its own —
    // a CSS/tag locator is the only option here (locator preference #6).
    this.cards = page.locator('app-book-card');
  }

  cardByTitle(title: string): BookCardComponent {
    return new BookCardComponent(this.cards.filter({ hasText: title }));
  }

  headingByTitle(title: string): Locator {
    return this.page.getByRole('heading', { name: title, exact: true });
  }
}
