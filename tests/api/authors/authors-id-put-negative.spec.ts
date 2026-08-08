import { APIRequestContext } from '@playwright/test';
import { test, expect } from '@fixtures/test.fixture';
import { AuthorResponse, AuthorSchema } from '@api/models/author.model';
import {
  HTTP_200_OK,
  HTTP_201_CREATED,
  HTTP_204_NO_CONTENT,
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_415_UNSUPPORTED_MEDIA_TYPE,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON, CONTENT_TYPE_TEXT_PLAIN } from '@api/consts/content.types.const';
import {
  NOT_SUPPORTED_MESSAGE_FRAGMENT,
  OPERATION_NOT_PERFORMED_MESSAGE,
  incorrectInputDataMessage,
  invalidPathVariableMessage,
} from '@api/consts/api.error.messages.const';
import {
  DECIMAL_ID,
  INVALID_BEARER_TOKEN,
  MALFORMED_JSON_BODY,
  NON_NUMERIC_ID,
  OVERSIZED_NAME,
  SQL_INJECTION_VALUE,
  XSS_INJECTION_VALUE,
} from '@data/negative.inputs.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';
import { parseResponse } from '@utils/parse.response.utils';
import { getRandomFirstName, getRandomLastName } from '@utils/random.data.utils';

const API_URL = 'https://bookstoreapi.up.railway.app';

// ARCHITECTURE NOTE: this file still calls the raw `request` fixture instead of the
// AuthorsAPIRequest / AuthorsAPISteps layers used by the POST, PATCH and DELETE author specs. That
// refactor is tracked separately; the assertion, cleanup and schema fixes below are applied in
// place so this file matches its siblings' rigour in the meantime.

// The OpenAPI spec documents only a 200 response for PUT /authors/{id} - no error responses are
// declared. Every case below was probed directly against the live API and asserts the exact
// observed status code and error message, rather than a "not 200 / below 500" range that would let
// a 400 -> 404/401 regression pass unnoticed.

// Name generation goes through the shared helpers, which already sanitize faker values down to
// the letters-only, 3-character minimum the live API enforces. The previous file-local sanitizer
// only guarded against an empty result and intermittently seeded names the API rejected with 400.
const randomFirstName = getRandomFirstName;
const randomLastName = getRandomLastName;
const validPayload = (): { firstName: string; lastName: string } => ({
  firstName: randomFirstName(),
  lastName: randomLastName(),
});

async function seedAuthor(request: APIRequestContext): Promise<AuthorResponse> {
  const response = await request.post(`${API_URL}/authors`, {
    headers: { 'Content-Type': CONTENT_TYPE_JSON },
    data: validPayload(),
  });

  expect(response.status(), 'test setup must be able to seed an author').toBe(HTTP_201_CREATED);
  return parseResponse<AuthorResponse>(response);
}

test.describe(
  'PUT /authors/{id} - negative and robustness scenarios',
  { tag: ['@api', '@authors', '@regression'] },
  () => {
    const createdAuthorIds: number[] = [];

    test.afterEach(async ({ request }) => {
      for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
        const response = await request.delete(`${API_URL}/authors/${id}`);
        expect(response.status(), `cleanup failed for author ${id} - test data leaked`).toBe(HTTP_204_NO_CONTENT);
      }
    });

    test('should return 404 when updating a non-existent id (NEG-AUTHORS-PUT-001)', async ({ request }) => {
      // The absent id is created and then deleted rather than hardcoded, so "does not exist" is a
      // guaranteed precondition instead of an assumption about the environment's data.
      const deleted = await seedAuthor(request);
      const deleteResponse = await request.delete(`${API_URL}/authors/${deleted.id}`);
      expect(deleteResponse.status()).toBe(HTTP_204_NO_CONTENT);

      const updateResponse = await request.put(`${API_URL}/authors/${deleted.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: validPayload(),
      });

      // Contract gap: 404 is not documented for this operation, only 200.
      expect(updateResponse.status()).toBe(HTTP_404_NOT_FOUND);
      expect(await updateResponse.body(), 'the 404 is returned with an empty body').toHaveLength(0);

      const getResponse = await request.get(`${API_URL}/authors/${deleted.id}`);
      expect(getResponse.status(), 'a rejected update must not resurrect the author').toBe(HTTP_404_NOT_FOUND);
    });

    test('should reject an update using a non-numeric id (NEG-AUTHORS-PUT-002)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/authors/${NON_NUMERIC_ID}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: validPayload(),
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(invalidPathVariableMessage(NON_NUMERIC_ID));
    });

    test('should return 404 when updating using a negative id (NEG-AUTHORS-PUT-003)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/authors/-1`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: validPayload(),
      });

      // A negative id is a syntactically valid int64, so it is treated as "not found" rather than as
      // a malformed path variable - the same behavior as any other non-existent id.
      expect(updateResponse.status()).toBe(HTTP_404_NOT_FOUND);
      expect(await updateResponse.body()).toHaveLength(0);
    });

    test('should reject an update using a decimal id (NEG-AUTHORS-PUT-004)', async ({ request }) => {
      const updateResponse = await request.put(`${API_URL}/authors/${DECIMAL_ID}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: validPayload(),
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(invalidPathVariableMessage(DECIMAL_ID));
    });

    test('should reject a request with no body sent and leave the author unchanged (NEG-AUTHORS-PUT-005)', async ({
      request,
    }) => {
      const created = await seedAuthor(request);
      createdAuthorIds.push(created.id);

      const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      expect(await parseResponse<AuthorResponse>(getResponse)).toEqual(created);
    });

    test('should reject malformed JSON syntax and leave the author unchanged (NEG-AUTHORS-PUT-006)', async ({
      request,
    }) => {
      const created = await seedAuthor(request);
      createdAuthorIds.push(created.id);

      const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: MALFORMED_JSON_BODY,
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      expect(await parseResponse<AuthorResponse>(getResponse)).toEqual(created);
    });

    test('should reject firstName sent as an integer and leave the author unchanged (NEG-AUTHORS-PUT-007)', async ({
      request,
    }) => {
      const created = await seedAuthor(request);
      createdAuthorIds.push(created.id);

      const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { firstName: 12345, lastName: randomLastName() },
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('firstName'));

      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      expect(await parseResponse<AuthorResponse>(getResponse)).toEqual(created);
    });

    test('should reject lastName sent as an array and leave the author unchanged (NEG-AUTHORS-PUT-008)', async ({
      request,
    }) => {
      const created = await seedAuthor(request);
      createdAuthorIds.push(created.id);

      const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { firstName: randomFirstName(), lastName: [randomLastName()] },
      });

      expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      expect(await parseResponse<AuthorResponse>(getResponse)).toEqual(created);
    });

    test('should ignore a client-supplied id and undocumented fields (NEG-AUTHORS-PUT-009)', async ({ request }) => {
      const created = await seedAuthor(request);
      createdAuthorIds.push(created.id);

      const clientSuppliedId = 999;
      const payload = validPayload();

      const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { ...payload, id: clientSuppliedId, createdAt: '2020-01-01' },
      });

      expect(updateResponse.status()).toBe(HTTP_200_OK);

      // AuthorSchema is strict, so this also proves `createdAt` is not echoed back to the client.
      const result = AuthorSchema.safeParse(await parseResponse<unknown>(updateResponse));
      expect(
        result.success,
        `undocumented fields must not appear in the response: ${JSON.stringify(result.error?.issues)}`,
      ).toBe(true);
      expect(result.data, 'the path id wins over any client-supplied id').toEqual({ id: created.id, ...payload });

      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      expect(await parseResponse<AuthorResponse>(getResponse)).toEqual({ id: created.id, ...payload });
    });

    test('should reject an excessively long firstName and leave the author unchanged (NEG-AUTHORS-PUT-010)', async ({
      request,
    }) => {
      const created = await seedAuthor(request);
      createdAuthorIds.push(created.id);

      const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { firstName: OVERSIZED_NAME, lastName: randomLastName() },
      });

      expect(updateResponse.status(), 'no maxLength is documented, but the API enforces one').toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('firstName'));

      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      expect(await parseResponse<AuthorResponse>(getResponse)).toEqual(created);
    });

    test('should reject injection-style characters and leave the author unchanged (NEG-AUTHORS-PUT-011)', async ({
      request,
    }) => {
      const created = await seedAuthor(request);
      createdAuthorIds.push(created.id);

      const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON },
        data: { firstName: SQL_INJECTION_VALUE, lastName: XSS_INJECTION_VALUE },
      });

      expect(updateResponse.status(), 'injection payloads must be rejected by name validation').toBe(
        HTTP_400_BAD_REQUEST,
      );

      // parseApiError also proves the body is JSON and never text/html, so a rejected payload can
      // never be reflected back in an executable form.
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error)).toEqual(
        expect.arrayContaining([incorrectInputDataMessage('firstName'), incorrectInputDataMessage('lastName')]),
      );
      expect(JSON.stringify(error), 'the rejected payload must not be echoed back verbatim').not.toContain(
        XSS_INJECTION_VALUE,
      );

      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      expect(await parseResponse<AuthorResponse>(getResponse)).toEqual(created);
    });

    test('should reject an unsupported Content-Type header (NEG-AUTHORS-PUT-012)', async ({ request }) => {
      const created = await seedAuthor(request);
      createdAuthorIds.push(created.id);

      const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_TEXT_PLAIN },
        data: '{ "firstName": "Jane", "lastName": "Austen" }',
      });

      expect(updateResponse.status()).toBe(HTTP_415_UNSUPPORTED_MEDIA_TYPE);
      const error = await parseApiError(updateResponse);
      expect(getApiErrorMessages(error).join(' ')).toContain(NOT_SUPPORTED_MESSAGE_FRAGMENT);

      const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
      expect(await parseResponse<AuthorResponse>(getResponse)).toEqual(created);
    });

    test('should not fail with a server error when an invalid bearer token is supplied (NEG-AUTHORS-PUT-013)', async ({
      request,
    }) => {
      // KNOWN DEFECT (expected failure): the endpoint declares no security scheme, so an unparseable
      // credential must either be ignored (200) or rejected cleanly (401). The live API instead
      // returns 500 {"message":"Invalid token"} on every /authors verb - the same defect already
      // recorded for GET in NEG-AUTHORS-GET-006. Marked with test.fail() so the defect stays visible
      // and this test turns red the moment the API is fixed.
      test.fail();

      const created = await seedAuthor(request);
      createdAuthorIds.push(created.id);

      const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
        headers: { 'Content-Type': CONTENT_TYPE_JSON, Authorization: INVALID_BEARER_TOKEN },
        data: validPayload(),
      });

      expect(updateResponse.status(), 'an invalid token must not crash a public endpoint').toBeLessThan(
        HTTP_500_INTERNAL_SERVER_ERROR,
      );
    });
  },
);
