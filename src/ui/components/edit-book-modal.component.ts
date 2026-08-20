import { Page, Locator } from '@playwright/test';
import { toExactTextRegExp } from '@utils/regexp.utils';

/**
 * Represents the "Edit Book" modal on the Books Management page.
 *
 * The app keeps every modal (`.modal`, five of them) mounted at all times, hiding the inactive ones
 * with `display: none` and toggling an `active` class on whichever is open. This component is
 * therefore scoped to the one `.modal` that contains the "Edit Book" heading rather than to
 * `.modal.active`:
 * - scoping by `.active` makes `root` stop matching anything once the modal closes, which turns
 *   `expect(root).toBeHidden()` into an assertion that passes vacuously (a locator matching zero
 *   elements is "hidden"); scoping by content keeps the element matched but hidden, so closing the
 *   modal is genuinely verifiable;
 * - the scope is still required, since a bare text/role locator for an author name would also match
 *   the book's own row in the management table and the "Add New Book" modal's identical checklist.
 *
 * A CSS locator is unavoidable here: the modal exposes no ARIA role, no accessible name and no
 * test id (worth raising with the dev team as an a11y gap, alongside the icon-only row buttons).
 */
export class EditBookModalComponent {
  readonly root: Locator;
  readonly heading: Locator;
  readonly updateBookButton: Locator;

  constructor(page: Page) {
    this.root = page.locator('.modal').filter({ hasText: 'Edit Book' });
    this.heading = this.root.getByRole('heading', { name: 'Edit Book' });
    this.updateBookButton = this.root.getByRole('button', { name: 'Update Book' });
  }

  /**
   * Row/label wrapper for a single author checkbox entry, keyed by the author's full name. Each
   * entry has no ARIA role/label of its own (a checkbox next to a plain text span, both wrapped in
   * an unlabelled `.author-checkbox` row) — `.author-checkbox` is the row/label wrapper itself.
   *
   * The name is matched exactly: the checklist holds every author in the environment, so the
   * default substring match would also select authors whose name merely contains this one
   * ("Kent Beck" vs "Kent Beckett") and either fail on strict mode or toggle the wrong author.
   */
  private authorRow(fullName: string): Locator {
    return this.root.locator('.author-checkbox').filter({ hasText: toExactTextRegExp(fullName) });
  }

  /**
   * Every checklist entry matching a full name — lets a test assert the name it is about to act on
   * identifies exactly one author before interacting with it.
   */
  authorRows(fullName: string): Locator {
    return this.authorRow(fullName);
  }

  /** The checkbox input for a single author entry, keyed by full name. */
  authorCheckbox(fullName: string): Locator {
    return this.authorRow(fullName).getByRole('checkbox');
  }

  /**
   * Toggles the author's checkbox on/off. Clicks the row/label wrapper rather than the raw
   * checkbox input — clicking the bare input was observed to sometimes not register/submit
   * correctly during live validation.
   */
  async toggleAuthor(fullName: string): Promise<void> {
    await this.authorRow(fullName).click();
  }

  async submit(): Promise<void> {
    await this.updateBookButton.click();
  }
}
