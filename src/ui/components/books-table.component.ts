import { Page, Locator } from '@playwright/test';
import { BookRowComponent } from '@ui/components/book-row.component';

/**
 * Represents the books table shown on the Books Management page — lists every book with its
 * authors and per-row edit/delete actions. Every lookup is scoped to the table itself, so an
 * unrelated `row` elsewhere on the page can never be picked up.
 */
export class BooksTableComponent {
  readonly root: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('table');
    // Body rows only — the header row is a `row` in the accessibility tree too, so an unscoped
    // `getByRole('row')` would make every row count off by one.
    this.rows = this.root.getByRole('rowgroup').last().getByRole('row');
  }

  /** The row of the book with the given exact title. */
  rowByTitle(title: string): BookRowComponent {
    return new BookRowComponent(this.root.getByRole('row', { name: title }));
  }
}
