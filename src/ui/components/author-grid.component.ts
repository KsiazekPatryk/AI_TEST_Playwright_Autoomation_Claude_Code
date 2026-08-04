import { Page, Locator } from '@playwright/test';
import { AuthorCardComponent } from '@ui/components/author-card.component';

/**
 * Represents the grid/list of `.author-card` elements shown on the
 * Authors management page. Reusable wherever the author grid fragment
 * appears (full grid, search-filtered grid).
 */
export class AuthorGridComponent {
  readonly cards: Locator;

  constructor(private readonly root: Page | Locator) {
    // `.author-card` is a custom class with no ARIA role of its own —
    // a CSS class locator is the only option here (locator preference #6).
    this.cards = root.locator('.author-card');
  }

  /** All cards whose heading matches the given full name exactly. */
  cardsByFullName(fullName: string): Locator {
    return this.cards.filter({ has: this.root.getByRole('heading', { name: fullName, exact: true }) });
  }

  /** The card of the author with the given full name. */
  cardByFullName(fullName: string): AuthorCardComponent {
    return new AuthorCardComponent(this.cardsByFullName(fullName));
  }
}
