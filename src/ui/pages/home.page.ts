import { Page, Locator } from '@playwright/test';
import { BookGridComponent } from '@ui/components/book-grid.component';

/**
 * Represents the bookstore home page ("Available Books") — the catalog
 * landing view with the live search filter and the book grid.
 */
export class HomePage {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly bookGrid: BookGridComponent;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Available Books' });
    this.searchInput = page.getByPlaceholder('Search books by title or author...');
    this.bookGrid = new BookGridComponent(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async searchFor(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }
}
