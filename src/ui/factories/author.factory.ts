import { faker } from '@faker-js/faker';
import { AuthorFormData } from '@ui/models/author.model';

/**
 * Builds a unique author payload. The random suffix on the last name
 * guarantees no collision with authors left behind by earlier runs in the
 * shared demo environment, so the created author stays addressable by name.
 * The suffix is letters-only — the app rejects names containing digits with
 * "❌ Invalid data submitted".
 */
export function createAuthorFormData(): AuthorFormData {
  const firstName = faker.person.firstName();
  const lastName = `${faker.person.lastName()}${faker.string.alpha({ length: 6, casing: 'lower' })}`;

  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}
