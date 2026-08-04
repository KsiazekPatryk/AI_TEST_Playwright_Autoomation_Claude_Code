import { Locator } from '@playwright/test';

/**
 * Represents a single `.author-card` fragment within the author grid.
 * Wraps a root Locator scoped to one card so it can be reused wherever
 * author cards appear (e.g. the full grid, a search-filtered grid).
 */
export class AuthorCardComponent {
  readonly heading: Locator;
  readonly id: Locator;

  constructor(root: Locator) {
    this.heading = root.getByRole('heading');
    this.id = root.getByText(/^ID: \d+$/);
  }
}
