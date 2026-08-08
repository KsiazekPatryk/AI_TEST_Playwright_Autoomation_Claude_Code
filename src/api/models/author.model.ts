import { z } from 'zod';

export interface AuthorPayload {
  firstName: string;
  lastName: string;
  [key: string]: unknown;
}

/**
 * Runtime contract for `#/components/schemas/Author`.
 *
 * - `id` is documented as `integer, format: int64`, so `.int()` is enforced (a plain `z.number()`
 *   would accept `1.5`).
 * - `strictObject` deliberately goes beyond the spec, which does not set
 *   `additionalProperties: false`. Any undocumented field — for example an accidentally exposed
 *   credential — must fail the contract tests rather than be silently stripped.
 */
export const AuthorSchema = z.strictObject({
  id: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
});

export const AuthorsCollectionSchema = z.array(AuthorSchema);

export type AuthorResponse = z.infer<typeof AuthorSchema>;
