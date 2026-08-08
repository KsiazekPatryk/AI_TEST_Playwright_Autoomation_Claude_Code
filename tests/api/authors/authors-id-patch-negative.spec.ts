import { test, expect } from '@fixtures/test.fixture';
import {
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_415_UNSUPPORTED_MEDIA_TYPE,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import {
  NOT_SUPPORTED_MESSAGE_FRAGMENT,
  OPERATION_NOT_PERFORMED_MESSAGE,
  incorrectInputDataMessage,
  invalidPathVariableMessage,
} from '@api/consts/api.error.messages.const';
import {
  DECIMAL_ID,
  INVALID_BEARER_TOKEN,
  NON_NUMERIC_ID,
  NON_OBJECT_ARRAY_BODY,
  UNTERMINATED_JSON_BODY,
} from '@data/negative.inputs.const';
import { getApiErrorMessages, parseApiError } from '@utils/api.error.utils';

// The OpenAPI spec documents only a 200 response for PATCH /authors/{id} - no error responses are
// declared. Every case below was probed directly against the live API and asserts the exact
// observed status code and error message, rather than a "not 200 / below 500" range that would let
// a 400 -> 404/401 regression pass unnoticed.

test.describe(
  'PATCH /authors/{id} - negative and robustness scenarios',
  { tag: ['@api', '@authors', '@regression'] },
  () => {
    const createdAuthorIds: number[] = [];

    test.afterEach(async ({ authorsApiSteps }) => {
      for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
        await authorsApiSteps.deleteAuthor(id);
      }
    });

    const invalidIdPaths = [
      { description: 'a non-numeric id path parameter (abc)', id: NON_NUMERIC_ID, caseId: 'NEG-AUTHORS-PATCH-001' },
      { description: 'a decimal id path parameter (1.5)', id: DECIMAL_ID, caseId: 'NEG-AUTHORS-PATCH-007' },
    ];

    invalidIdPaths.forEach(({ description, id, caseId }) => {
      test(`should reject a PATCH with ${description} (${caseId})`, async ({ authorsApiRequest }) => {
        const patchResponse = await authorsApiRequest.updateAuthorPartially(id, { firstName: 'PatchedFirst' });

        expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
        const error = await parseApiError(patchResponse);
        expect(getApiErrorMessages(error)).toContain(invalidPathVariableMessage(id));
      });
    });

    test('should return 404 when patching a non-existent id (NEG-AUTHORS-PATCH-002)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      // The absent id is created and then deleted rather than hardcoded, so "does not exist" is a
      // guaranteed precondition instead of an assumption about the environment's data.
      const deleted = await authorsApiSteps.createAuthor();
      await authorsApiSteps.deleteAuthor(deleted.id);

      const patchResponse = await authorsApiRequest.updateAuthorPartially(deleted.id, { firstName: 'GhostAuthor' });

      // Contract gap: 404 is not documented for this operation, only 200.
      expect(patchResponse.status()).toBe(HTTP_404_NOT_FOUND);
      expect(await patchResponse.body(), 'the 404 is returned with an empty body').toHaveLength(0);
    });

    test('should reject malformed JSON syntax and leave the author unchanged (NEG-AUTHORS-PATCH-003)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      const created = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(created.id);

      const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, UNTERMINATED_JSON_BODY, {
        'Content-Type': CONTENT_TYPE_JSON,
      });

      expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(patchResponse);
      expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

      const author = await authorsApiSteps.getAuthorById(created.id);
      expect(author, 'a rejected patch must not mutate the author').toEqual(created);
    });

    test('should reject firstName sent as a number and leave the author unchanged (NEG-AUTHORS-PATCH-004)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      const created = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(created.id);

      const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, { firstName: 12345 });

      expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(patchResponse);
      expect(getApiErrorMessages(error)).toContain(incorrectInputDataMessage('firstName'));

      const author = await authorsApiSteps.getAuthorById(created.id);
      expect(author, 'a rejected patch must not mutate the author').toEqual(created);
    });

    test('should reject a non-object (array) request body and leave the author unchanged (NEG-AUTHORS-PATCH-005)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      const created = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(created.id);

      const patchResponse = await authorsApiRequest.updateAuthorPartially(created.id, NON_OBJECT_ARRAY_BODY);

      expect(patchResponse.status()).toBe(HTTP_400_BAD_REQUEST);
      const error = await parseApiError(patchResponse);
      expect(getApiErrorMessages(error)).toContain(OPERATION_NOT_PERFORMED_MESSAGE);

      const author = await authorsApiSteps.getAuthorById(created.id);
      expect(author, 'a rejected patch must not mutate the author').toEqual(created);
    });

    test('should reject a request with no Content-Type header (NEG-AUTHORS-PATCH-006)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      const created = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(created.id);

      // The header is omitted entirely rather than sent empty, which is what the scenario
      // specifies: the body then arrives as application/octet-stream and is refused with a 415.
      const patchResponse = await authorsApiRequest.updateAuthorPartially(
        created.id,
        '{ "firstName": "NoContentTypeFirst" }',
      );

      expect(patchResponse.status()).toBe(HTTP_415_UNSUPPORTED_MEDIA_TYPE);
      const error = await parseApiError(patchResponse);
      expect(getApiErrorMessages(error).join(' ')).toContain(NOT_SUPPORTED_MESSAGE_FRAGMENT);

      const author = await authorsApiSteps.getAuthorById(created.id);
      expect(author, 'a rejected patch must not mutate the author').toEqual(created);
    });

    test('should not fail with a server error when an invalid bearer token is supplied (NEG-AUTHORS-PATCH-008)', async ({
      authorsApiSteps,
      authorsApiRequest,
    }) => {
      // KNOWN DEFECT (expected failure): the endpoint declares no security scheme, so an
      // unparseable credential must either be ignored (200) or rejected cleanly (401). The live
      // API instead returns 500 {"message":"Invalid token"} on every /authors verb - the same
      // defect already recorded for GET in NEG-AUTHORS-GET-006. Marked with test.fail() so the
      // defect stays visible and this test turns red the moment the API is fixed.
      test.fail();

      const created = await authorsApiSteps.createAuthor();
      createdAuthorIds.push(created.id);

      const patchResponse = await authorsApiRequest.updateAuthorPartially(
        created.id,
        { firstName: 'TokenProbe' },
        { Authorization: INVALID_BEARER_TOKEN },
      );

      expect(patchResponse.status(), 'an invalid token must not crash a public endpoint').toBeLessThan(
        HTTP_500_INTERNAL_SERVER_ERROR,
      );
    });
  },
);
