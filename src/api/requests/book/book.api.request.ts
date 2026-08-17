import { APIResponse } from '@playwright/test';
import { API_ENDPOINTS } from '@api/consts/api.endpoints.const';
import { APIPayload, APIRequest, MultipartFile, QueryParams, RequestHeaders } from '@api/requests/api.request';

export class BooksAPIRequest {
  constructor(private readonly api: APIRequest) {}

  async createBook(payload?: APIPayload, headers?: RequestHeaders): Promise<APIResponse> {
    return this.api.post(API_ENDPOINTS.books.base, payload, headers);
  }

  async getBooks(params?: QueryParams, headers?: RequestHeaders): Promise<APIResponse> {
    return this.api.get(API_ENDPOINTS.books.base, params, headers);
  }

  async updateBook(id: number | string, payload?: APIPayload, headers?: RequestHeaders): Promise<APIResponse> {
    return this.api.put(API_ENDPOINTS.books.byId(id), payload, headers);
  }

  async updateBookPartially(id: number | string, payload?: APIPayload, headers?: RequestHeaders): Promise<APIResponse> {
    return this.api.patch(API_ENDPOINTS.books.byId(id), payload, headers);
  }

  /**
   * Issues the multipart `PATCH /books/{id}/cover` upload. Kept separate from
   * `updateBookPartially` (which sends a JSON body) since Playwright's `multipart` fetch option is
   * a structurally different request shape from a JSON `data` payload.
   */
  async uploadBookCover(id: number | string, file: MultipartFile): Promise<APIResponse> {
    return this.api.patchMultipart(API_ENDPOINTS.books.cover(id), { file });
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

  async deleteBooksCollection(): Promise<APIResponse> {
    return this.api.delete(API_ENDPOINTS.books.base);
  }
}
