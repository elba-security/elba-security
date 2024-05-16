import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { createElbaRequestHandlers } from '../msw';

if (!process.env.ELBA_API_BASE_URL || !process.env.ELBA_API_KEY) {
  throw new Error('ELBA_API_BASE_URL and ELBA_API_KEY environment variables must be set');
}

const elbaRequestHandlers = createElbaRequestHandlers(
  process.env.ELBA_API_BASE_URL,
  process.env.ELBA_API_KEY
);

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
