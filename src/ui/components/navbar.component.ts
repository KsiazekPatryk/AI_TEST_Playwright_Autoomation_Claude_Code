import { Page, Locator } from '@playwright/test';

/**
 * Represents the top navigation bar, shared across every page of the
 * bookstore app (home, authors, etc.). The "Authors (N)" link doubles as
 * both a navigation control and a live-ish counter of the total author
 * count, so it is exposed here rather than duplicated per page.
 */
export class NavbarComponent {
  readonly authorsLink: Locator;

  constructor(root: Page | Locator) {
    this.authorsLink = root.getByRole('link', { name: /^Authors \(\d+\)$/ });
  }

  async goToAuthors(): Promise<void> {
    await this.authorsLink.click();
  }

  /** Reads the total author count rendered in the "Authors (N)" nav link. */
  async getAuthorsCount(): Promise<number> {
    const label = await this.authorsLink.textContent();
    const match = label?.match(/\d+/);

    if (!match) {
      throw new Error(`Authors nav link does not contain a count: "${label}"`);
    }

    return Number(match[0]);
  }
}
