import { Page, Locator } from '@playwright/test';
import { AuthorFormData } from '@ui/models/author.model';

/**
 * Represents the "Add New Author" form fragment on the Authors management
 * page, revealed after clicking the "Add New Author" button.
 */
export class AddAuthorFormComponent {
  readonly heading: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly submitButton: Locator;

  /** @param root - form container; the page itself when the form is rendered inline. */
  constructor(root: Page | Locator) {
    this.heading = root.getByRole('heading', { name: /Add New Author/ });
    this.firstNameInput = root.getByRole('textbox', { name: 'First Name', exact: true });
    this.lastNameInput = root.getByRole('textbox', { name: 'Last Name', exact: true });
    this.submitButton = root.getByRole('button', { name: 'Add Author', exact: true });
  }

  async submitNewAuthor(author: AuthorFormData): Promise<void> {
    await this.firstNameInput.fill(author.firstName);
    await this.lastNameInput.fill(author.lastName);
    await this.submitButton.click();
  }
}
