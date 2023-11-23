/* eslint-disable @typescript-eslint/no-unsafe-assignment -- conveniency until we enforce an env. var. validation */
import { createElbaRequestHandlers } from 'elba-msw';
import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';

const elbaRequestHandlers = createElbaRequestHandlers(
  process.env.ELBA_API_BASE_URL!,
  process.env.ELBA_API_KEY!
);

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
