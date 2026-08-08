import { AuthorResponse } from '@api/models/author.model';

export interface BookPayload {
  title: string;
  year: number;
  price: number;
  available: number;
  authors: number[];
  [key: string]: unknown;
}

export interface BookResponse {
  id: number;
  title: string;
  year: number;
  price: number;
  available: number;
  authors: AuthorResponse[];
  [key: string]: unknown;
}
