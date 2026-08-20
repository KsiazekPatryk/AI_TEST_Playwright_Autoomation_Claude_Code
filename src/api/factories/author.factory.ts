import { AuthorPayload } from '@api/models/author.model';
import { getRandomFirstName, getRandomLastName, getRandomUniqueLastName } from '@utils/random.data.utils';

export function getRandomAuthorPayload(): AuthorPayload {
  return {
    firstName: getRandomFirstName(),
    lastName: getRandomLastName(),
  };
}

/**
 * Author payload whose full name is unique in the shared environment. Use this instead of
 * `getRandomAuthorPayload()` whenever the author is looked up by name in the UI (E2E flows), where
 * a duplicate name resolves to several elements and either fails on strict mode or acts on the
 * wrong author.
 */
export function getRandomUniqueAuthorPayload(): AuthorPayload {
  return {
    firstName: getRandomFirstName(),
    lastName: getRandomUniqueLastName(),
  };
}

export function getRandomAuthorOverridePayload(overrides: Partial<AuthorPayload>): AuthorPayload {
  return {
    ...getRandomAuthorPayload(),
    ...overrides,
  };
}
