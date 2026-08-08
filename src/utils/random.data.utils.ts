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
