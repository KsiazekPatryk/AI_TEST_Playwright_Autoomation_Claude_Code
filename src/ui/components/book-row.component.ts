import { Locator } from '@playwright/test';

/**
 * Represents a single `<tr>` fragment within the Books Management table.
 * Wraps a root Locator scoped to one row so it can be reused wherever a
 * single book's row needs to be located and acted upon.
 */
export class BookRowComponent {
  readonly titleCell: Locator;
  readonly authorsCell: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  constructor(readonly root: Locator) {
    // Every cell exposes the same `cell` role, so the only way to address one column is by the
    // purpose-named class the app puts on it. Preferred over a positional `nth()` index, which
    // would silently shift the day a column is added.
    this.titleCell = root.locator('.book-title-cell');
    this.authorsCell = root.locator('.authors-cell');
    // The edit/delete icon buttons have no accessible name beyond their emoji glyph — raise with
    // the dev team as an a11y gap (same pattern as the search button on the Authors page). The
    // patterns also accept a proper accessible name, so these keep working once that gap is fixed.
    this.editButton = root.getByRole('button', { name: /✏️|edit/i });
    this.deleteButton = root.getByRole('button', { name: /🗑️|delete/i });
  }

  async clickEdit(): Promise<void> {
    await this.editButton.click();
  }
}
