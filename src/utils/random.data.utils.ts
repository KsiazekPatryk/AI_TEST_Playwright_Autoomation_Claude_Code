import { faker } from '@faker-js/faker';

/**
 * The live bookstore API rejects author firstName/lastName values that contain any character
 * outside [A-Za-z] (apostrophes, digits, diacritics, etc.) with a 400, and also rejects names
 * shorter than 3 letters. Faker-generated person names occasionally hit both cases, so every
 * generated name is sanitized down to letters only, falling back to a safe default when the
 * sanitized result is too short.
 */
function sanitizeName(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z]/g, '');
  return cleaned.length >= 3 ? cleaned : 'Test';
}

export function getRandomFirstName(): string {
  return sanitizeName(faker.person.firstName());
}

export function getRandomLastName(): string {
  return sanitizeName(faker.person.lastName());
}

/**
 * Last name carrying a letters-only random suffix, so the resulting full name is unique in the
 * shared demo environment. Required whenever an author has to stay addressable *by name* in the UI
 * (e.g. the "Edit Book" modal lists every author that exists, currently 40+), since a plain faker
 * name can collide with a seeded author or with one left behind by an earlier run — the same
 * guarantee `@ui/factories/author.factory.ts` already makes for UI-created authors.
 */
export function getRandomUniqueLastName(): string {
  return `${getRandomLastName()}${faker.string.alpha({ length: 6, casing: 'lower' })}`;
}

/**
 * Letters-only name that is long and unique enough to match no existing author, so an
 * empty-result assertion cannot be perturbed by concurrently running specs. Deliberately kept
 * within the API's accepted character set, so "no match" is not confused with "invalid value".
 */
export function getRandomNonExistingName(): string {
  return `NoMatch${faker.string.alpha({ length: 20 })}`;
}

/**
 * Short alphanumeric fragment used to build a value (e.g. a book title) that is unique to a single
 * test, so substring-filter assertions can't be perturbed by data created by concurrently running
 * specs (tests run with `fullyParallel: true`).
 */
export function getRandomUniqueFragment(): string {
  return faker.string.alphanumeric(10);
}
