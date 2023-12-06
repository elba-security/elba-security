import { createElbaRequestHandlers } from '@elba-security/test-utils';
import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';

const baseUrl = process.env.ELBA_API_BASE_URL;
const apiKey = process.env.ELBA_API_KEY;

if (!baseUrl || !apiKey) {
  throw new Error('could not setup msw test server');
}

const elbaRequestHandlers = createElbaRequestHandlers(baseUrl, apiKey);
const server = setupServer(...elbaRequestHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => {
  server.close();
});
afterEach(() => {
  server.resetHandlers();
});
