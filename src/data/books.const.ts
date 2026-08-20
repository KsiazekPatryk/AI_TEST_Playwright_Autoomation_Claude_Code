/**
 * Static seed values for the bookstore catalog under test.
 * The catalog is deterministic, so these expected values live here as a
 * single source of truth (faker is intentionally not used for known books).
 */
export const CATALOG_SIZE = 29;

export const EFFECTIVE_JAVA = {
  title: 'Effective Java',
  author: 'Joshua Bloch',
  year: '2008',
  price: '$107.28',
  stock: '100',
} as const;

/**
 * Title prefix for books created by E2E flows. Combined with a random unique fragment it keeps
 * generated titles recognisable in the shared catalog and collision-free under `fullyParallel`.
 */
export const E2E_BOOK_TITLE_PREFIX = 'E2E Add Author';

export const UNRELATED_TITLES = [
  'Java Puzzlers',
  'Java Concurrency in Practice',
  'Thinking in Java',
  'Functional Programming in Java',
] as const;
