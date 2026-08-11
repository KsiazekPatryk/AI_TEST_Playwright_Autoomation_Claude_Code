import { APIResponse } from '@playwright/test';
import { API_ENDPOINTS } from '@api/consts/api.endpoints.const';
import { APIPayload, APIRequest, QueryParams, RequestHeaders } from '@api/requests/api.request';

export class BooksAPIRequest {
  constructor(private readonly api: APIRequest) {}

  async createBook(payload?: APIPayload, headers?: RequestHeaders): Promise<APIResponse> {
    return this.api.post(API_ENDPOINTS.books.base, payload, headers);
  }

  async getBooks(params?: QueryParams, headers?: RequestHeaders): Promise<APIResponse> {
    return this.api.get(API_ENDPOINTS.books.base, params, headers);
  }

  /**
   * Issues a GET /books request with a caller-supplied raw query string (including the leading
   * `?`). Needed for negative scenarios (duplicated/malformed query params) where the query must
   * bypass normal URLSearchParams encoding to reach the server byte-for-byte as written.
   */
  async getBooksByRawQuery(rawQueryString: string): Promise<APIResponse> {
    return this.api.get(`${API_ENDPOINTS.books.base}${rawQueryString}`);
  }

  async getBookById(id: number | string): Promise<APIResponse> {
    return this.api.get(API_ENDPOINTS.books.byId(id));
  }

  async deleteBook(id: number | string, headers?: RequestHeaders): Promise<APIResponse> {
    return this.api.delete(API_ENDPOINTS.books.byId(id), headers);
  }
}
