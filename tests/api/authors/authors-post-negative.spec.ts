import { test, expect } from '@fixtures/test.fixture';
import { getRandomAuthorOverridePayload, getRandomAuthorPayload } from '@api/factories/author.factory';
import { AuthorSchema } from '@api/models/author.model';
import {
  HTTP_201_CREATED,
  HTTP_400_BAD_REQUEST,
  HTTP_415_UNSUPPORTED_MEDIA_TYPE,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON, CONTENT_TYPE_TEXT_PLAIN } from '@api/consts/content.types.const';
import {
  NOT_SUPPORTED_MESSAGE_FRAGMENT,
  OPERATION_NOT_PERFORMED_MESSAGE,
  incorrectInputDataMessage,
} from '@api/consts/api.error.messages.const';
import {
  INVALID_BEARER_TOKEN,
  MALFORMED_JSON_BODY,
  OVERSIZED_NAME,
  SQL_INJECTION_VALUE,
  XSS_INJECTION_VALUE,
} from '@data/negative.inputs.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';
import { parseResponse } from '@utils/parse.response.utils';

// The OpenAPI spec documents only a 201 response for POST /authors - no error responses are
// defined. Every case below was probed directly against the live API, and each test asserts the
// exact observed status code and error message rather than a status range: the API is fully
// deterministic here, so a range check would let a 400 -> 404/401 regression pass unnoticed.

test.describe('POST /authors - negative and robustness scenarios', { tag: ['@api', '@authors', '@regression'] }, () => {
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ authorsApiSteps }) => {
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  test('should reject a request with no body sent (NEG-AUTHORS-POST-001)', async ({ authorsApiRequest }) => {
    const response = await authorsApiRequest.createAuthor(undefined, { 'Content-Type': CONTENT_TYPE_JSON });

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);
  });

  test('should reject malformed JSON syntax in the request body (NEG-AUTHORS-POST-002)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.createAuthor(MALFORMED_JSON_BODY, {
      'Content-Type': CONTENT_TYPE_JSON,
    });

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);
  });

  test('should reject firstName sent as an integer instead of a string (NEG-AUTHORS-POST-003)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.createAuthor({ firstName: 12345, lastName: 'Austen' });

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('firstName'));
  });

  test('should reject lastName sent as an array instead of a string (NEG-AUTHORS-POST-004)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.createAuthor({ firstName: 'Jane', lastName: ['Austen'] });

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    // A wrong JSON type fails at binding time, so the generic message is returned here rather than
    // the per-field one used for values that bind but fail validation.
    expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);
  });

  test('should reject explicit null values for firstName and lastName (NEG-AUTHORS-POST-005)', async ({
    authorsApiRequest,
  }) => {
    const response = await authorsApiRequest.createAuthor({ firstName: null, lastName: null });

    expect(response.status()).toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toEqual(
      expect.arrayContaining([incorrectInputDataMessage('firstName'), incorrectInputDataMessage('lastName')]),
    );
  });

  test('should ignore a client-supplied id and undocumented fields (NEG-AUTHORS-POST-006)', async ({
    authorsApiRequest,
  }) => {
    const clientSuppliedId = 999;
    const payload = getRandomAuthorOverridePayload({ id: clientSuppliedId, middleName: 'X' });

    const response = await authorsApiRequest.createAuthor(payload);

    expect(response.status(), 'undocumented fields are ignored, not rejected').toBe(HTTP_201_CREATED);
    expect(response.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    // AuthorSchema is strict, so this also proves `middleName` is not echoed back to the client.
    const result = AuthorSchema.safeParse(await parseResponse<unknown>(response));
    expect(
      result.success,
      `undocumented fields must not appear in the response: ${JSON.stringify(result.error?.issues)}`,
    ).toBe(true);

    const created = result.data!;
    createdAuthorIds.push(created.id);
    expect(created.id, 'the server must generate the id, ignoring the client-supplied one').not.toBe(clientSuppliedId);
    expect(created).toMatchObject({ firstName: payload.firstName, lastName: payload.lastName });
  });

  test('should reject an excessively long firstName value (NEG-AUTHORS-POST-007)', async ({ authorsApiRequest }) => {
    const payload = getRandomAuthorOverridePayload({ firstName: OVERSIZED_NAME });

    const response = await authorsApiRequest.createAuthor(payload);

    expect(response.status(), 'no maxLength is documented, but the API enforces one').toBe(HTTP_400_BAD_REQUEST);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('firstName'));
  });

  test('should reject injection-style characters in firstName and lastName (NEG-AUTHORS-POST-008)', async ({
    authorsApiRequest,
  }) => {
    const payload = getRandomAuthorOverridePayload({
      firstName: SQL_INJECTION_VALUE,
      lastName: XSS_INJECTION_VALUE,
    });

    const response = await authorsApiRequest.createAuthor(payload);

    expect(response.status(), 'injection payloads must be rejected by name validation').toBe(HTTP_400_BAD_REQUEST);

    // parseApiError also proves the body is JSON and never text/html, so a rejected payload can
    // never be reflected back in an executable form.
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error)).toEqual(
      expect.arrayContaining([incorrectInputDataMessage('firstName'), incorrectInputDataMessage('lastName')]),
    );
    expect(JSON.stringify(error), 'the rejected payload must not be echoed back verbatim').not.toContain(
      XSS_INJECTION_VALUE,
    );
  });

  test('should reject an unsupported Content-Type header (NEG-AUTHORS-POST-009)', async ({ authorsApiRequest }) => {
    const response = await authorsApiRequest.createAuthor('{ "firstName": "Jane", "lastName": "Austen" }', {
      'Content-Type': CONTENT_TYPE_TEXT_PLAIN,
    });

    expect(response.status()).toBe(HTTP_415_UNSUPPORTED_MEDIA_TYPE);
    const error = await parseApiError(response);
    expect(getApiErrorMessages(error).join(' ')).toContain(NOT_SUPPORTED_MESSAGE_FRAGMENT);
  });

  test('should not fail with a server error when an invalid bearer token is supplied (NEG-AUTHORS-POST-010)', async ({
    authorsApiRequest,
  }) => {
    // KNOWN DEFECT (expected failure): the endpoint declares no security scheme, so an unparseable
    // credential must either be ignored (201) or rejected cleanly (401). The live API instead
    // returns 500 {"message":"Invalid token"} on every /authors verb - the same defect already
    // recorded for GET in NEG-AUTHORS-GET-006. Marked with test.fail() so the defect stays visible
    // and this test turns red the moment the API is fixed.
    test.fail();

    const response = await authorsApiRequest.createAuthor(getRandomAuthorPayload(), {
      Authorization: INVALID_BEARER_TOKEN,
    });

    expect(response.status(), 'an invalid token must not crash a public endpoint').toBeLessThan(
      HTTP_500_INTERNAL_SERVER_ERROR,
    );
  });
});
