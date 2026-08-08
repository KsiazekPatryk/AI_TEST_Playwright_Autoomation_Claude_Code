import { expect } from '@playwright/test';
import { getRandomAuthorPayload } from '@api/factories/author.factory';
import { AuthorPayload, AuthorResponse } from '@api/models/author.model';
import { AuthorsAPIRequest } from '@api/requests/author/author.api.request';
import { QueryParams } from '@api/requests/api.request';
import { HTTP_200_OK, HTTP_201_CREATED } from '@api/consts/http.status.codes.const';
import { parseResponse } from '@utils/parse.response.utils';

export class AuthorsAPISteps {
  constructor(private readonly authorsApiRequest: AuthorsAPIRequest) {}

  async createAuthor(payload?: AuthorPayload): Promise<AuthorResponse> {
    const data = payload ?? getRandomAuthorPayload();
    const response = await this.authorsApiRequest.createAuthor(data);
    expect(response.status()).toBe(HTTP_201_CREATED);
    const responseBody = await parseResponse<AuthorResponse>(response);
    expect(responseBody).toHaveProperty('id');
    return responseBody;
  }

  async deleteAuthor(id: number): Promise<void> {
    await this.authorsApiRequest.deleteAuthor(id);
  }

  async getAuthors(params?: QueryParams): Promise<AuthorResponse[]> {
    const response = await this.authorsApiRequest.getAuthors(params);
    expect(response.status()).toBe(HTTP_200_OK);
    return parseResponse<AuthorResponse[]>(response);
  }

  async getAuthorById(id: number): Promise<AuthorResponse> {
    const response = await this.authorsApiRequest.getAuthorById(id);
    expect(response.status()).toBe(HTTP_200_OK);
    return parseResponse<AuthorResponse>(response);
  }
}
