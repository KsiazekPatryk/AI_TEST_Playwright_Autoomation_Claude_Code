export const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3000';

export const API_ENDPOINTS = {
  authors: {
    base: `${API_BASE_URL}/authors`,
    byId: (id: number | string) => `${API_BASE_URL}/authors/${id}`,
  },
  books: {
    base: `${API_BASE_URL}/books`,
    byId: (id: number | string) => `${API_BASE_URL}/books/${id}`,
  },
  // resource: {
  //   base: `${API_BASE_URL}/resource`,
  //   byId: (id: number) => `${API_BASE_URL}/resource/${id}`,
  // },
};
