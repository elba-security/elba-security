import { serve } from '@hono/node-server';
import type { Context, Next } from 'hono';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { elbaApiRoutes } from './src/routes';

const app = new Hono();

const port = 3522;
const pathPrefix = '/api/rest';

const isVerboseModeEnabled = process.argv[2] && process.argv[2] === '-v';

const logRequestBody = async (context: Context, next: Next) => {
  const requestBody: unknown = await context.req.raw.clone().json();
  // eslint-disable-next-line no-console -- To display request json body
  console.log(JSON.stringify(requestBody, null, 2));
  await next();
};

app.use('*', logger());

if (isVerboseModeEnabled) {
  app.use('*', logRequestBody);
}

for (const route of elbaApiRoutes) {
  // TODO: handle authentication
  app[route.method](`${pathPrefix}${route.path}`, async ({ req: { raw: request } }) =>
    route.handler({ request })
  );
}

serve({ port, fetch: app.fetch });
// eslint-disable-next-line no-console -- To display server running status
console.log(`elba API running on http://localhost:${port}`);
