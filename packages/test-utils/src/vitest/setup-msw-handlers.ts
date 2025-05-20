import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { type RequestHandler } from 'msw';
import { createElbaRequestHandlers } from '../msw';

let elbaRequestHandlers: RequestHandler[] = [];
if (process.env.ELBA_API_BASE_URL && process.env.ELBA_API_KEY) {
  elbaRequestHandlers = createElbaRequestHandlers(
    process.env.ELBA_API_BASE_URL,
    process.env.ELBA_API_KEY
  );
}

export const server = setupServer(...elbaRequestHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  server.resetHandlers();
});
