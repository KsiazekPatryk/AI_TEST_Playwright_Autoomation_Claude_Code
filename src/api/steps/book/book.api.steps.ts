import { expect } from '@playwright/test';
import { getRandomBookPayload } from '@api/factories/book.factory';
import { BookPayload, BookResponse, BookSchema, RestBook, RestBooksCollectionSchema } from '@api/models/book.model';
import { BooksAPIRequest } from '@api/requests/book/book.api.request';
import { QueryParams, RequestHeaders } from '@api/requests/api.request';
import { HTTP_200_OK, HTTP_201_CREATED, HTTP_204_NO_CONTENT } from '@api/consts/http.status.codes.const';
import { CONTENT_TYPE_JSON } from '@api/consts/content.types.const';
import { parseResponse } from '@utils/parse.response.utils';

export class BooksAPISteps {
  constructor(private readonly booksApiRequest: BooksAPIRequest) {}

  async createBook(payload?: BookPayload, headers?: RequestHeaders): Promise<BookResponse> {
    const data = payload ?? getRandomBookPayload();
    const response = await this.booksApiRequest.createBook(data, headers);

    expect(response.status()).toBe(HTTP_201_CREATED);
    expect(response.headers()['content-type'], 'POST /books must serve JSON').toContain(CONTENT_TYPE_JSON);

    const responseBody = await parseResponse<unknown>(response);
    const result = BookSchema.safeParse(responseBody);
    expect(
      result.success,
      `POST /books response violates the Book contract: ${JSON.stringify(result.error?.issues)}`,
    ).toBe(true);

    return result.data as BookResponse;
  }

  async getBookById(id: number): Promise<BookResponse> {
    const response = await this.booksApiRequest.getBookById(id);

    expect(response.status()).toBe(HTTP_200_OK);
    expect(response.headers()['content-type'], 'GET /books/{id} must serve JSON').toContain(CONTENT_TYPE_JSON);

    const responseBody = await parseResponse<unknown>(response);
    const result = BookSchema.safeParse(responseBody);
    expect(
      result.success,
      `GET /books/{id} response violates the Book contract: ${JSON.stringify(result.error?.issues)}`,
    ).toBe(true);

    return result.data as BookResponse;
  }

  /**
   * GET /books returns the RestBook collection shape, which is distinct from the single-item Book
   * shape returned by getBookById / createBook — see book.model.ts for the full contract note.
   */
  async getBooks(params?: QueryParams, headers?: RequestHeaders): Promise<RestBook[]> {
    const response = await this.booksApiRequest.getBooks(params, headers);

    expect(response.status()).toBe(HTTP_200_OK);
    expect(response.headers()['content-type'], 'GET /books must serve JSON').toContain(CONTENT_TYPE_JSON);

    const responseBody = await parseResponse<unknown>(response);
    const result = RestBooksCollectionSchema.safeParse(responseBody);
    expect(
      result.success,
      `GET /books response violates the RestBook contract: ${JSON.stringify(result.error?.issues)}`,
    ).toBe(true);

    return result.data as RestBook[];
  }

  async deleteBook(id: number): Promise<void> {
    const response = await this.booksApiRequest.deleteBook(id);
    expect(response.status(), `cleanup failed for book ${id} - test data leaked`).toBe(HTTP_204_NO_CONTENT);
  }
}
