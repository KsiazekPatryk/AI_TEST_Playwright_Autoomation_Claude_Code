import { APIRequestContext } from '@playwright/test';
import { test, expect } from '@fixtures/test.fixture';
import { AuthorResponse, AuthorSchema } from '@api/models/author.model';
import {
  HTTP_200_OK,
  HTTP_201_CREATED,
  HTTP_204_NO_CONTENT,
  HTTP_400_BAD_REQUEST,
} from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { incorrectInputDataMessage } from '@api/consts/api.error.messages.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';
import { parseResponse } from '@utils/parse.response.utils';
import { getRandomFirstName, getRandomLastName } from '@utils/random.data.utils';

const API_URL = 'https://bookstoreapi.up.railway.app';

// ARCHITECTURE NOTE: this file still calls the raw `request` fixture instead of the
// AuthorsAPIRequest / AuthorsAPISteps layers used by the POST, PATCH and DELETE author specs. That
// refactor is tracked separately; the assertion, cleanup and schema fixes below are applied in
// place so this file matches its siblings' rigour in the meantime.

// CONTRACT DEVIATION (probed against the live API): UpdateAuthorPayload declares firstName and
// lastName as optional, but the running API rejects a PUT missing either field - including `{}` -
// with 400 and a per-field "<field> incorrect input data" message. POS-AUTHORS-PUT-002/003/004
// assert that actual behavior; the deviation is recorded in the scenario file so the two agree.

// Name generation goes through the shared helpers, which already sanitize faker values down to
// the letters-only, 3-character minimum the live API enforces. The previous file-local sanitizer
// only guarded against an empty result and intermittently seeded names the API rejected with 400.
const randomFirstName = getRandomFirstName;
const randomLastName = getRandomLastName;

async function seedAuthor(request: APIRequestContext): Promise<AuthorResponse> {
  const response = await request.post(`${API_URL}/authors`, {
    headers: { 'Content-Type': CONTENT_TYPE_JSON },
    data: { firstName: randomFirstName(), lastName: randomLastName() },
  });

  expect(response.status(), 'test setup must be able to seed an author').toBe(HTTP_201_CREATED);
  return parseResponse<AuthorResponse>(response);
}

test.describe('PUT /authors/{id} - positive scenarios', { tag: ['@api', '@authors', '@smoke'] }, () => {
  const createdAuthorIds: number[] = [];
  let created: AuthorResponse;

  test.beforeEach(async ({ request }) => {
    created = await seedAuthor(request);
    // Registered before any assertion can throw, so a failing test never leaks its fixture data.
    createdAuthorIds.push(created.id);
  });

  test.afterEach(async ({ request }) => {
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      const response = await request.delete(`${API_URL}/authors/${id}`);
      expect(response.status(), `cleanup failed for author ${id} - test data leaked`).toBe(HTTP_204_NO_CONTENT);
    }
  });

  test('should update an existing author with both firstName and lastName (POS-AUTHORS-PUT-001)', async ({
    request,
  }) => {
    const payload = { firstName: randomFirstName(), lastName: randomLastName() };

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });

    expect(updateResponse.status()).toBe(HTTP_200_OK);
    expect(updateResponse.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const result = AuthorSchema.safeParse(await parseResponse<unknown>(updateResponse));
    expect(result.success, `PUT response violates the Author contract: ${JSON.stringify(result.error?.issues)}`).toBe(
      true,
    );
    expect(result.data).toEqual({ id: created.id, ...payload });

    const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
    expect(getResponse.status()).toBe(HTTP_200_OK);
    expect(await parseResponse<AuthorResponse>(getResponse)).toEqual({ id: created.id, ...payload });
  });

  test('should reject an update with only firstName provided despite the optional schema (POS-AUTHORS-PUT-002)', async ({
    request,
  }) => {
    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: { firstName: randomFirstName() },
    });

    expect(updateResponse.status(), 'the live API requires lastName despite the optional schema').toBe(
      HTTP_400_BAD_REQUEST,
    );
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('lastName'));
  });

  test('should reject an update with only lastName provided despite the optional schema (POS-AUTHORS-PUT-003)', async ({
    request,
  }) => {
    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: { lastName: randomLastName() },
    });

    expect(updateResponse.status(), 'the live API requires firstName despite the optional schema').toBe(
      HTTP_400_BAD_REQUEST,
    );
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('firstName'));
  });

  test('should reject an empty payload and leave the author unchanged (POS-AUTHORS-PUT-004)', async ({ request }) => {
    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: {},
    });

    expect(updateResponse.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(updateResponse);
    expect(getApiErrorMessages(error)).toEqual(
      expect.arrayContaining([incorrectInputDataMessage('firstName'), incorrectInputDataMessage('lastName')]),
    );

    const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
    expect(getResponse.status()).toBe(HTTP_200_OK);
    expect(await parseResponse<AuthorResponse>(getResponse), 'a rejected update must not mutate the author').toEqual(
      created,
    );
  });

  test('should reflect an updated author on a subsequent GET (POS-AUTHORS-PUT-005)', async ({ request }) => {
    const payload = { firstName: randomFirstName(), lastName: randomLastName() };

    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(updateResponse.status()).toBe(HTTP_200_OK);

    const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
    expect(getResponse.status()).toBe(HTTP_200_OK);
    expect(getResponse.headers()['content-type']).toContain(CONTENT_TYPE_JSON);
    expect(await parseResponse<AuthorResponse>(getResponse)).toEqual({ id: created.id, ...payload });
  });

  test('should be idempotent for repeated identical updates (POS-AUTHORS-PUT-006)', async ({ request }) => {
    const payload = { firstName: randomFirstName(), lastName: randomLastName() };

    const firstUpdate = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(firstUpdate.status()).toBe(HTTP_200_OK);
    expect(await parseResponse<AuthorResponse>(firstUpdate)).toEqual({ id: created.id, ...payload });

    const secondUpdate = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });
    expect(secondUpdate.status()).toBe(HTTP_200_OK);
    expect(
      await parseResponse<AuthorResponse>(secondUpdate),
      'a repeated identical update must converge to the same state',
    ).toEqual({ id: created.id, ...payload });

    const getResponse = await request.get(`${API_URL}/authors/${created.id}`);
    expect(await parseResponse<AuthorResponse>(getResponse)).toEqual({ id: created.id, ...payload });
  });

  test('should update an author without an Authorization header (POS-AUTHORS-PUT-007)', async ({ request }) => {
    const payload = { firstName: randomFirstName(), lastName: randomLastName() };

    // The spec declares no securitySchemes, so the endpoint must succeed with no credential at
    // all. Pinned explicitly so that introducing auth breaks this test.
    const updateResponse = await request.put(`${API_URL}/authors/${created.id}`, {
      headers: { 'Content-Type': CONTENT_TYPE_JSON },
      data: payload,
    });

    expect(updateResponse.status(), 'PUT /authors/{id} is unauthenticated - revisit if security is added').toBe(
      HTTP_200_OK,
    );
    expect(updateResponse.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const result = AuthorSchema.safeParse(await parseResponse<unknown>(updateResponse));
    expect(result.success, `PUT response violates the Author contract: ${JSON.stringify(result.error?.issues)}`).toBe(
      true,
    );
    expect(result.data).toEqual({ id: created.id, ...payload });
  });
});
