import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { elbaApiRoutes } from './src/routes';

const app = new Hono();

const port = 3522;
const pathPrefix = '/api/rest';

app.use('*', logger());
for (const route of elbaApiRoutes) {
  // TODO: handle authentication
  app[route.method](`${pathPrefix}${route.path}`, async ({ req: { raw: request } }) =>
    route.handler({ request })
  );
}

serve({ port, fetch: app.fetch });
// eslint-disable-next-line no-console -- To display server running status
console.log(`elba API running on http://localhost:${port}`);
