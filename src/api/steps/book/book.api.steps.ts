import { expect } from '@playwright/test';
import { getRandomBookPayload } from '@api/factories/book.factory';
import { BookPayload, BookResponse } from '@api/models/book.model';
import { BooksAPIRequest } from '@api/requests/book/book.api.request';
import { HTTP_200_OK, HTTP_201_CREATED, HTTP_204_NO_CONTENT } from '@api/consts/http.status.codes.const';
import { parseResponse } from '@utils/parse.response.utils';

export class BooksAPISteps {
  constructor(private readonly booksApiRequest: BooksAPIRequest) {}

  async createBook(payload?: BookPayload): Promise<BookResponse> {
    const data = payload ?? getRandomBookPayload();
    const response = await this.booksApiRequest.createBook(data);
    expect(response.status()).toBe(HTTP_201_CREATED);
    const responseBody = await parseResponse<BookResponse>(response);
    expect(responseBody).toHaveProperty('id');
    return responseBody;
  }

  async getBookById(id: number): Promise<BookResponse> {
    const response = await this.booksApiRequest.getBookById(id);
    expect(response.status()).toBe(HTTP_200_OK);
    return parseResponse<BookResponse>(response);
  }

  async deleteBook(id: number): Promise<void> {
    const response = await this.booksApiRequest.deleteBook(id);
    expect(response.status(), `cleanup failed for book ${id} - test data leaked`).toBe(HTTP_204_NO_CONTENT);
  }
}
