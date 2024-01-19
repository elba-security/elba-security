import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { http, passthrough } from 'msw';
import { createElbaRequestHandlers } from '@elba-security/test-utils';
import { env } from '@/common/env';

const server = setupServer(
  http.all(`http://localhost:${env.POSTGRES_PROXY_PORT}/*`, () => passthrough()),
  ...createElbaRequestHandlers(env.ELBA_API_BASE_URL, env.ELBA_API_KEY)
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
