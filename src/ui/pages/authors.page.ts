import { Page, Locator } from '@playwright/test';
import { NavbarComponent } from '@ui/components/navbar.component';
import { AuthorGridComponent } from '@ui/components/author-grid.component';
import { AddAuthorFormComponent } from '@ui/components/add-author-form.component';
import { AuthorFormData } from '@ui/models/author.model';
import { ROUTES } from '@data/routes.const';

/**
 * Represents the "Authors Management" page — lists existing authors,
 * supports adding a new one and searching the grid.
 */
export class AuthorsPage {
  readonly heading: Locator;
  readonly addNewAuthorButton: Locator;
  readonly successToast: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly noAuthorsFoundMessage: Locator;
  readonly navbar: NavbarComponent;
  readonly authorGrid: AuthorGridComponent;
  readonly addAuthorForm: AddAuthorFormComponent;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /Authors Management/ });
    this.addNewAuthorButton = page.getByRole('button', { name: /Add New Author/ });
    this.successToast = page.getByText('Author added successfully!');
    this.searchInput = page.getByRole('textbox', { name: 'Search by first name or last name...' });
    // '🔍' is the button's only accessible name — raise with the dev team as an a11y gap.
    this.searchButton = page.getByRole('button', { name: '🔍' });
    this.noAuthorsFoundMessage = page.getByText('No authors found.');
    this.navbar = new NavbarComponent(page);
    this.authorGrid = new AuthorGridComponent(page);
    this.addAuthorForm = new AddAuthorFormComponent(page);
  }

  /** Navigates directly to the Authors page (also used to reload it). */
  async goto(): Promise<void> {
    await this.page.goto(ROUTES.authors);
  }

  /** Confirms navigation landed on the Authors page — throws/times out otherwise. */
  async waitForUrl(): Promise<void> {
    await this.page.waitForURL(ROUTES.authors);
  }

  async openAddAuthorForm(): Promise<void> {
    await this.addNewAuthorButton.click();
  }

  /** Opens the "Add New Author" form and submits it with the given data. */
  async addAuthor(author: AuthorFormData): Promise<void> {
    await this.openAddAuthorForm();
    await this.addAuthorForm.submitNewAuthor(author);
  }

  /**
   * Filters the author grid. The backend matches the query against first
   * name OR last name as separate fields (not the concatenated full name),
   * so callers should search with a single name part.
   */
  async searchByName(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchButton.click();
  }
}
