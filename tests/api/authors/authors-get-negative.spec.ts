import { test, expect } from '@fixtures/test.fixture';
import { AuthorResponse, AuthorsCollectionSchema } from '@api/models/author.model';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import {
  HTTP_200_OK,
  HTTP_401_UNAUTHORIZED,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from '@api/consts/http.status.codes.const';
import {
  DUPLICATED_FIRST_NAME_QUERY,
  INVALID_BEARER_TOKEN,
  MALFORMED_ENCODED_QUERY,
  OVERSIZED_NAME,
  SQL_INJECTION_VALUE,
  UNKNOWN_QUERY_PARAM,
  XSS_INJECTION_VALUE,
} from '@data/negative.inputs.const';
import { parseResponse } from '@utils/parse.response.utils';

// The OpenAPI spec documents only a 200 response for GET /authors - no error responses are
// defined. The live API was probed directly for every case below, and each test asserts the
// actually observed status and body rather than an invented status code or a conditional
// "if it happened to be 200" check. A 5xx response is always flagged as a robustness defect.

test.describe('GET /authors - negative and robustness scenarios', { tag: ['@api', '@authors', '@regression'] }, () => {
  const createdAuthorIds: number[] = [];

  test.afterEach(async ({ authorsApiSteps }) => {
    for (const id of createdAuthorIds.splice(0, createdAuthorIds.length)) {
      await authorsApiSteps.deleteAuthor(id);
    }
  });

  test('should handle an excessively long firstName value without a server error (NEG-AUTHORS-GET-001)', async ({
    authorsApiRequest,
  }) => {
    // Observed live behavior: an oversized filter value is accepted and simply matches nothing -
    // the endpoint returns 200 with an empty array rather than a 400. POST /authors rejects such
    // a name with a 400, so no author can ever carry this value and the empty result is stable.
    const response = await authorsApiRequest.getAuthors({ firstName: OVERSIZED_NAME });

    expect(response.status()).toBe(HTTP_200_OK);
    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
    expect(response.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const body = await parseResponse<AuthorResponse[]>(response);
    expect(AuthorsCollectionSchema.safeParse(body).success).toBe(true);
    expect(body, 'an oversized filter value must match nothing, not be ignored').toEqual([]);
  });

  test('should handle injection-style characters in firstName and lastName (NEG-AUTHORS-GET-002)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const seeded = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(seeded.id);

    const response = await authorsApiRequest.getAuthors({
      firstName: SQL_INJECTION_VALUE,
      lastName: XSS_INJECTION_VALUE,
    });

    expect(response.status()).toBe(HTTP_200_OK);
    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
    expect(response.headers()['content-type'], 'reflected payloads must never be served as HTML').toContain(
      CONTENT_TYPE_JSON,
    );

    const body = await parseResponse<AuthorResponse[]>(response);
    expect(AuthorsCollectionSchema.safeParse(body).success).toBe(true);
    // The seeded author proves the collection is non-empty, so an empty result means the injection
    // values were applied as literal filter values and did not bypass filtering.
    expect(body, 'injection payloads must not bypass filtering').toEqual([]);
  });

  test('should handle a duplicated query parameter with conflicting values (NEG-AUTHORS-GET-003)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const seeded = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(seeded.id);

    const response = await authorsApiRequest.getAuthorsByRawQuery(DUPLICATED_FIRST_NAME_QUERY);

    expect(response.status()).toBe(HTTP_200_OK);
    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
    expect(response.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const body = await parseResponse<AuthorResponse[]>(response);
    expect(AuthorsCollectionSchema.safeParse(body).success).toBe(true);
    // Observed live behavior: duplicated values are bound as a single combined value, so neither
    // "Alice" nor "Bob" is used as a filter and nothing matches. Recorded as a contract-gap
    // finding - the important part is that it does not fall back to the unfiltered collection.
    expect(body, 'a duplicated query parameter must not return the unfiltered collection').toEqual([]);
  });

  test('should ignore an unknown/undocumented query parameter (NEG-AUTHORS-GET-004)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const seeded = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(seeded.id);

    const response = await authorsApiRequest.getAuthors(UNKNOWN_QUERY_PARAM);

    expect(response.status()).toBe(HTTP_200_OK);
    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
    expect(response.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const body = await parseResponse<AuthorResponse[]>(response);
    expect(AuthorsCollectionSchema.safeParse(body).success).toBe(true);
    expect(
      body.map((author) => author.id),
      'an unknown parameter must be ignored, not applied as a filter',
    ).toContain(seeded.id);
  });

  test('should handle a malformed URL-encoded query value (NEG-AUTHORS-GET-005)', async ({
    authorsApiSteps,
    authorsApiRequest,
  }) => {
    const seeded = await authorsApiSteps.createAuthor();
    createdAuthorIds.push(seeded.id);

    const response = await authorsApiRequest.getAuthorsByRawQuery(MALFORMED_ENCODED_QUERY);

    expect(response.status()).toBe(HTTP_200_OK);
    expect(response.status()).toBeLessThan(HTTP_500_INTERNAL_SERVER_ERROR);
    expect(response.headers()['content-type']).toContain(CONTENT_TYPE_JSON);

    const body = await parseResponse<AuthorResponse[]>(response);
    expect(AuthorsCollectionSchema.safeParse(body).success).toBe(true);
    // Contract gap: the malformed filter is silently dropped and the unfiltered collection is
    // returned instead of a 400 - the seeded author comes back even though its name is not "%zz".
    expect(
      body.map((author) => author.id),
      'a malformed filter is currently ignored, returning the full collection',
    ).toContain(seeded.id);
  });

  test('should not fail with a server error when an invalid bearer token is supplied (NEG-AUTHORS-GET-006)', async ({
    authorsApiRequest,
  }) => {
    // KNOWN DEFECT (expected failure): the endpoint declares no security scheme, so an unparseable
    // credential must either be ignored (200) or rejected cleanly (401). The live API instead
    // returns 500 {"message":"Invalid token"}, crashing a public read endpoint on malformed input.
    // Marked with test.fail() so the defect stays visible and this test turns red the moment the
    // API is fixed and the assertions below start passing.
    test.fail();

    const response = await authorsApiRequest.getAuthors(undefined, { Authorization: INVALID_BEARER_TOKEN });

    expect(response.status(), 'an invalid token must not crash a public endpoint').toBeLessThan(
      HTTP_500_INTERNAL_SERVER_ERROR,
    );
    expect([HTTP_200_OK, HTTP_401_UNAUTHORIZED]).toContain(response.status());
  });
});
