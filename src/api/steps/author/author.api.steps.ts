import { expect } from '@playwright/test';
import { getRandomAuthorPayload } from '@api/factories/author.factory';
import { AuthorPayload, AuthorResponse, AuthorSchema, AuthorsCollectionSchema } from '@api/models/author.model';
import { AuthorsAPIRequest } from '@api/requests/author/author.api.request';
import { QueryParams } from '@api/requests/api.request';
import { HTTP_200_OK, HTTP_201_CREATED, HTTP_204_NO_CONTENT } from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { parseResponse } from '@utils/parse.response.utils';

export class AuthorsAPISteps {
  constructor(private readonly authorsApiRequest: AuthorsAPIRequest) {}

  async createAuthor(payload?: AuthorPayload): Promise<AuthorResponse> {
    const data = payload ?? getRandomAuthorPayload();
    const response = await this.authorsApiRequest.createAuthor(data);

    expect(response.status()).toBe(HTTP_201_CREATED);
    expect(response.headers()['content-type'], 'POST /authors must serve JSON').toContain(CONTENT_TYPE_JSON);

    const responseBody = await parseResponse<unknown>(response);
    const result = AuthorSchema.safeParse(responseBody);
    expect(
      result.success,
      `POST /authors response violates the Author contract: ${JSON.stringify(result.error?.issues)}`,
    ).toBe(true);

    const created = result.data as AuthorResponse;
    expect(created, 'the created author must echo the submitted values').toMatchObject({
      firstName: data.firstName,
      lastName: data.lastName,
    });

    return created;
  }

  async deleteAuthor(id: number): Promise<void> {
    const response = await this.authorsApiRequest.deleteAuthor(id);
    expect(response.status(), `cleanup failed for author ${id} - test data leaked`).toBe(HTTP_204_NO_CONTENT);
  }

  async getAuthors(params?: QueryParams): Promise<AuthorResponse[]> {
    const response = await this.authorsApiRequest.getAuthors(params);

    expect(response.status()).toBe(HTTP_200_OK);
    expect(response.headers()['content-type'], 'GET /authors must serve JSON').toContain(CONTENT_TYPE_JSON);

    const responseBody = await parseResponse<unknown>(response);
    const result = AuthorsCollectionSchema.safeParse(responseBody);
    expect(
      result.success,
      `GET /authors response violates the Author[] contract: ${JSON.stringify(result.error?.issues)}`,
    ).toBe(true);

    return result.data as AuthorResponse[];
  }

  async getAuthorById(id: number): Promise<AuthorResponse> {
    const response = await this.authorsApiRequest.getAuthorById(id);

    expect(response.status()).toBe(HTTP_200_OK);
    expect(response.headers()['content-type'], 'GET /authors/{id} must serve JSON').toContain(CONTENT_TYPE_JSON);

    const responseBody = await parseResponse<unknown>(response);
    const result = AuthorSchema.safeParse(responseBody);
    expect(
      result.success,
      `GET /authors/{id} response violates the Author contract: ${JSON.stringify(result.error?.issues)}`,
    ).toBe(true);

    return result.data as AuthorResponse;
  }
}
