import { faker } from '@faker-js/faker';
import { BookPayload } from '@api/models/book.model';

/**
 * The live API enforces a unique constraint on `title` (409 Conflict on a duplicate) and
 * `faker.book.title()` draws from a small fixed pool, so every generated title embeds a random
 * unique suffix — required since specs run with `fullyParallel: true`.
 *
 * `year` is floored at 1900: the live API undocumentedly rejects `year < 1900` with a 400, so the
 * default range avoids tripping that floor for a plain happy-path payload.
 */
export function getRandomBookPayload(): BookPayload {
  return {
    title: `${faker.book.title()} ${faker.string.alphanumeric(10)}`,
    year: faker.number.int({ min: 1900, max: 2024 }),
    price: faker.number.float({ min: 1, max: 999, fractionDigits: 2 }),
    available: faker.number.int({ min: 1, max: 100 }),
    authors: [],
  };
}

export function getRandomBookOverridePayload(overrides: Partial<BookPayload>): BookPayload {
  return {
    ...getRandomBookPayload(),
    ...overrides,
  };
}
