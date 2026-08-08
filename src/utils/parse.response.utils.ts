import { APIResponse } from '@playwright/test';

export async function parseResponse<T>(response: APIResponse): Promise<T> {
  return response.json() as Promise<T>;
}
