import { APIResponse } from '@playwright/test';
import { API_ENDPOINTS } from '@api/consts/api.endpoints.const';
import { APIPayload, APIRequest, QueryParams, RequestHeaders } from '@api/requests/api.request';

export class AuthorsAPIRequest {
  constructor(private readonly api: APIRequest) {}

  async createAuthor(payload?: APIPayload, headers?: RequestHeaders): Promise<APIResponse> {
    return this.api.post(API_ENDPOINTS.authors.base, payload, headers);
  }

  async getAuthors(params?: QueryParams): Promise<APIResponse> {
    return this.api.get(API_ENDPOINTS.authors.base, params);
  }

  /**
   * Issues a GET /authors request with a caller-supplied raw query string (including the leading
   * `?`). Needed for negative scenarios (duplicated/malformed query params) where the query must
   * bypass normal URLSearchParams encoding to reach the server byte-for-byte as written.
   */
  async getAuthorsByRawQuery(rawQueryString: string): Promise<APIResponse> {
    return this.api.get(`${API_ENDPOINTS.authors.base}${rawQueryString}`);
  }

  async getAuthorById(id: number | string): Promise<APIResponse> {
    return this.api.get(API_ENDPOINTS.authors.byId(id));
  }

  async updateAuthorPartially(id: number | string, payload?: APIPayload, headers?: RequestHeaders): Promise<APIResponse> {
    return this.api.patch(API_ENDPOINTS.authors.byId(id), payload, headers);
  }

  async deleteAuthor(id: number | string): Promise<APIResponse> {
    return this.api.delete(API_ENDPOINTS.authors.byId(id));
  }

  async deleteAuthorsCollection(): Promise<APIResponse> {
    return this.api.delete(API_ENDPOINTS.authors.base);
  }
}
