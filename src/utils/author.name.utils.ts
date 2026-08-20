import { AuthorResponse } from '@api/models/author.model';

/**
 * The display form of an author's name, as rendered by the app (book card bylines, the books table
 * "Authors" column, the "Edit Book" author checklist). Kept in one place so a change to the app's
 * name format is a single-line fix rather than a hunt through every spec.
 */
export function getFullName(author: Pick<AuthorResponse, 'firstName' | 'lastName'>): string {
  return `${author.firstName} ${author.lastName}`;
}
