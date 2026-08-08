import { test as base } from '@playwright/test';
import { APIRequest } from '@api/requests/api.request';
import { AuthorsAPIRequest } from '@api/requests/author/author.api.request';
import { AuthorsAPISteps } from '@api/steps/author/author.api.steps';
import { BooksAPIRequest } from '@api/requests/book/book.api.request';
import { BooksAPISteps } from '@api/steps/book/book.api.steps';
// import { ResourceAPIRequest } from '@api/requests/resource/resource.api.request';
// import { ResourceAPISteps } from '@api/steps/resource/resource.api.steps';

type ApiFixtures = {
  apiRequest: APIRequest;
  authorsApiRequest: AuthorsAPIRequest;
  authorsApiSteps: AuthorsAPISteps;
  booksApiRequest: BooksAPIRequest;
  booksApiSteps: BooksAPISteps;
  // resourceApiRequest: ResourceAPIRequest;
  // resourceApiSteps: ResourceAPISteps;
};

export const test = base.extend<ApiFixtures>({
  apiRequest: async ({ request }, use) => {
    await use(new APIRequest(request));
  },
  authorsApiRequest: async ({ apiRequest }, use) => {
    await use(new AuthorsAPIRequest(apiRequest));
  },
  authorsApiSteps: async ({ authorsApiRequest }, use) => {
    await use(new AuthorsAPISteps(authorsApiRequest));
  },
  booksApiRequest: async ({ apiRequest }, use) => {
    await use(new BooksAPIRequest(apiRequest));
  },
  booksApiSteps: async ({ booksApiRequest }, use) => {
    await use(new BooksAPISteps(booksApiRequest));
  },
  // resourceApiRequest: async ({ apiRequest }, use) => {
  //   await use(new ResourceAPIRequest(apiRequest));
  // },
  // resourceApiSteps: async ({ resourceApiRequest }, use) => {
  //   await use(new ResourceAPISteps(resourceApiRequest));
  // },
});
