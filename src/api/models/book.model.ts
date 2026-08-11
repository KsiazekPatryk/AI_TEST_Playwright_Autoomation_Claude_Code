import { z } from 'zod';
import { AuthorResponse, AuthorSchema } from '@api/models/author.model';

export interface BookPayload {
  title: string;
  year: number;
  price: number;
  available: number;
  authors: number[];
  [key: string]: unknown;
}

export interface BookResponse {
  id: number;
  title: string;
  year: number;
  price: number;
  available: number;
  authors: AuthorResponse[];
  [key: string]: unknown;
}

/**
 * Runtime contract for `#/components/schemas/Book` — the single-item shape returned by
 * `POST /books` and `GET /books/{id}`. Unlike the collection endpoint's `RestBook` shape (below),
 * `authors` resolves to full `Author` objects (id/firstName/lastName) and the cover field is
 * `coverId` (int64), not `coverUrl`. Confirmed by probing the live API — the two shapes are
 * genuinely different response contracts for the same underlying resource and are deliberately not
 * merged into one schema.
 *
 * `strictObject` deliberately goes beyond the spec, which does not set
 * `additionalProperties: false`. Any undocumented field must fail the contract tests rather than be
 * silently ignored.
 */
export const BookSchema = z.strictObject({
  id: z.number().int(),
  title: z.string(),
  year: z.number().int(),
  price: z.number(),
  coverId: z.number().int().nullable(),
  available: z.number().int(),
  authors: z.array(AuthorSchema),
});

export type Book = z.infer<typeof BookSchema>;

/**
 * Runtime contract for `#/components/schemas/RestAuthor` — the author shape nested inside the
 * `GET /books` collection response. Deliberately distinct from `AuthorSchema`: only `firstName`
 * and `lastName` are exposed here, with no `id` field — a confirmed live-API contract finding (see
 * docs/scenarios/api/books-get-schema.scenario.md).
 */
export const RestAuthorSchema = z.strictObject({
  firstName: z.string(),
  lastName: z.string(),
});

export type RestAuthor = z.infer<typeof RestAuthorSchema>;

/**
 * Runtime contract for `#/components/schemas/RestBook` — the shape returned by the `GET /books`
 * collection endpoint. Distinct from `Book`: `authors` is `RestAuthor[]` (no id) and the cover
 * field is `coverUrl` (string), not `coverId` (int64).
 */
export const RestBookSchema = z.strictObject({
  id: z.number().int(),
  title: z.string(),
  year: z.number().int(),
  price: z.number(),
  coverUrl: z.string().nullable(),
  available: z.number().int(),
  authors: z.array(RestAuthorSchema),
});

export const RestBooksCollectionSchema = z.array(RestBookSchema);

export type RestBook = z.infer<typeof RestBookSchema>;
