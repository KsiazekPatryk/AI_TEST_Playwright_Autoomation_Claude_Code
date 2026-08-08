import { faker } from '@faker-js/faker';
import { BookPayload } from '@api/models/book.model';

export function getRandomBookPayload(): BookPayload {
  return {
    title: faker.book.title(),
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
