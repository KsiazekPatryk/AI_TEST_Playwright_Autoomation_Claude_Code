import { APIResponse, expect } from '@playwright/test';
import { ApiError, ApiErrorSchema } from '@api/models/api.error.model';
import { CONTENT_TYPE_HTML, CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { INTERNAL_DETAIL_MARKERS } from '@data/negative.inputs.const';
import { parseResponse } from '@utils/parse.response.utils';

/**
 * Validates an error response end to end and returns the parsed body so the calling test can
 * assert the message that is specific to its scenario.
 *
 * Bundles the three checks every error case needs - the body is served as JSON (never as HTML,
 * which would make a reflected payload exploitable), it matches the documented error envelope,
 * and it leaks no internal implementation detail.
 */
export async function parseApiError(response: APIResponse): Promise<ApiError> {
  const contentType = response.headers()['content-type'];
  expect(contentType, 'error responses must be served as JSON, never as HTML').toContain(CONTENT_TYPE_JSON);
  expect(contentType, 'an error body served as HTML would make a reflected payload executable').not.toContain(
    CONTENT_TYPE_HTML,
  );

  const body = await parseResponse<unknown>(response);
  const result = ApiErrorSchema.safeParse(body);
  expect(result.success, `error body violates the API error envelope: ${JSON.stringify(result.error?.issues)}`).toBe(
    true,
  );

  const error = result.data as ApiError;
  const serialized = JSON.stringify(error);
  const leakedMarkers = INTERNAL_DETAIL_MARKERS.filter((marker) => serialized.includes(marker));
  expect(leakedMarkers, 'error bodies must not leak stack traces or internal implementation detail').toEqual([]);

  return error;
}

/** Normalises the `message` field, which is a string for 405/415 and an array for 400/409. */
export function getApiErrorMessages(error: ApiError): string[] {
  return Array.isArray(error.message) ? error.message : [error.message];
}
