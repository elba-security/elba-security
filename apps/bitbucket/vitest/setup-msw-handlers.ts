import { createElbaRequestHandlers } from '@elba-security/test-utils';
import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { env } from '@/env';

export const server = setupServer(
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
