import { z } from 'zod';

/**
 * Runtime contract for the error envelope the bookstore API returns for every non-2xx response
 * that carries a body (400, 405, 409, 415).
 *
 * The OpenAPI definition documents no error responses at all, so this schema was derived by
 * probing the live API. `message` is an array of validation messages for 400/409 responses and a
 * single string for 405/415 responses.
 *
 * `strictObject` is deliberate: an error body that suddenly grows a `trace`, `exception` or
 * `debug` field is an information-leak regression and must fail the contract tests loudly rather
 * than be silently stripped.
 */
export const ApiErrorSchema = z.strictObject({
  timestamp: z.string(),
  status: z.number().int(),
  error: z.string(),
  message: z.union([z.string(), z.array(z.string())]),
  path: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
