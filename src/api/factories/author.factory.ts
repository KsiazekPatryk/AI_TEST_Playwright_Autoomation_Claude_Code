import { AuthorPayload } from '@api/models/author.model';
import { getRandomFirstName, getRandomLastName } from '@utils/random.data.utils';

export function getRandomAuthorPayload(): AuthorPayload {
  return {
    firstName: getRandomFirstName(),
    lastName: getRandomLastName(),
  };
}

export function getRandomAuthorOverridePayload(overrides: Partial<AuthorPayload>): AuthorPayload {
  return {
    ...getRandomAuthorPayload(),
    ...overrides,
  };
}
