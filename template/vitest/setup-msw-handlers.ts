/* eslint-disable @typescript-eslint/no-unsafe-assignment -- conveniency until we enforce an env. var. validation */
import { createElbaRequestHandlers } from 'elba-msw';
import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { http, passthrough } from 'msw';

const elbaRequestHandlers = createElbaRequestHandlers(
  process.env.ELBA_API_BASE_URL!,
  process.env.ELBA_API_KEY!
);

const server = setupServer(
  // Remove the next line if your integration does not works with edge runtime
  http.all(`http://localhost:${env.POSTGRES_PROXY}/*`, () => passthrough()),
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
