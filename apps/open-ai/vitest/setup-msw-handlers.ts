import { createElbaRequestHandlers } from '@elba-security/test-utils';
import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { http, passthrough } from 'msw';
import { env } from '@/env';

const elbaRequestHandlers = createElbaRequestHandlers(env.ELBA_API_BASE_URL, env.ELBA_API_KEY);

export const server = setupServer(
  // Remove the next line if your integration does not works with edge runtime
  http.all(`http://localhost:${env.DATABASE_PROXY_PORT}/*`, () => passthrough()),
  ...elbaRequestHandlers
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => {
  server.close();
});
afterEach(() => {
  server.resetHandlers();
});
