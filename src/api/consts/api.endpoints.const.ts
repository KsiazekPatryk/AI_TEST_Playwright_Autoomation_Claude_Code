export const API_BASE_URL = process.env.API_URL ?? 'http://localhost:3000';

export const API_ENDPOINTS = {
  authors: {
    base: `${API_BASE_URL}/authors`,
    byId: (id: number | string) => `${API_BASE_URL}/authors/${id}`,
  },
  books: {
    base: `${API_BASE_URL}/books`,
    byId: (id: number | string) => `${API_BASE_URL}/books/${id}`,
    cover: (id: number | string) => `${API_BASE_URL}/books/${id}/cover`,
  },
  // Not a full 3-layer resource - orders is out of scope for this refactor. Only the raw path is
  // needed, as a setup dependency for the books referential-integrity delete scenario
  // (NEG-BOOKS-DELETE-007), so this stays a plain endpoint constant rather than a dedicated
  // OrdersAPIRequest/OrdersAPISteps pair.
  orders: {
    base: `${API_BASE_URL}/orders`,
    byId: (id: number | string) => `${API_BASE_URL}/orders/${id}`,
  },
  // resource: {
  //   base: `${API_BASE_URL}/resource`,
  //   byId: (id: number) => `${API_BASE_URL}/resource/${id}`,
  // },
};
