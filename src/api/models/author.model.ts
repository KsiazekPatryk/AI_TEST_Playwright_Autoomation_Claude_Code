export interface AuthorPayload {
  firstName: string;
  lastName: string;
  [key: string]: unknown;
}

export interface AuthorResponse {
  id: number;
  firstName: string;
  lastName: string;
  [key: string]: unknown;
}
