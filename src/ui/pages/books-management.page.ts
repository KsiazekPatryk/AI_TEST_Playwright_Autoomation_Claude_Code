import { Page, Locator } from '@playwright/test';
import { BooksTableComponent } from '@ui/components/books-table.component';
import { EditBookModalComponent } from '@ui/components/edit-book-modal.component';
import { ROUTES } from '@data/routes.const';

/**
 * Represents the "Books Management" page — lists every book in a table
 * with per-row edit/delete actions, and the "Add New Book"/"Edit Book"
 * modals used to create or update a book.
 */
export class BooksManagementPage {
  readonly heading: Locator;
  readonly addNewBookButton: Locator;
  readonly booksTable: BooksTableComponent;
  readonly editBookModal: EditBookModalComponent;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /Books Management/ });
    this.addNewBookButton = page.getByRole('button', { name: /Add New Book/ });
    this.booksTable = new BooksTableComponent(page);
    this.editBookModal = new EditBookModalComponent(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.booksManagement);
  }

  /** Confirms navigation landed on the Books Management page — throws/times out otherwise. */
  async waitForUrl(): Promise<void> {
    await this.page.waitForURL(ROUTES.booksManagement);
  }

  /** Opens the "Edit Book" modal for the book with the given exact title. */
  async openEditBook(title: string): Promise<void> {
    await this.booksTable.rowByTitle(title).clickEdit();
  }
}
