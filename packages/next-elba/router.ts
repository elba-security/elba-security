import { type NextRequest } from 'next/server';
import { type ElbaConfig } from './config';
import { createInngest } from './inngest/client';
import { createDatabase } from './database/client';
import { type TableColumns } from './database/schema';
import { type ElbaContext } from './types';
// APIs
import { type ElbaRoute } from './api/types';
import { createInngestRoutes } from './api/inngest/route';
import { deleteUsers } from './api/webhooks/elba/users/delete-users/route';
import { install } from './api/install/route';
import { auth } from './api/auth/route';

type HTTPMethod = 'GET' | 'POST' | 'PUT';

const routes: Record<`${HTTPMethod} ${string}`, ElbaRoute> = {
  'GET /install': install,
  'GET /auth': auth,
  'POST /api/webhooks/elba/users/delete-users': deleteUsers,
};

const handler = <T extends TableColumns>(request: NextRequest, config: ElbaConfig<T>) => {
  const _config = config as ElbaConfig;
  const inngest = createInngest(_config);
  const { db, schema } = createDatabase(config);
  const context: ElbaContext = { config: _config, inngest, db, schema };

  const method = request.method as HTTPMethod;
  const { pathname } = request.nextUrl;

  if (pathname === '/api/inngest') {
    const inngestRoutes = createInngestRoutes(context);
    const inngestRoute = inngestRoutes[method];
    // @ts-expect-error -- no second arg for edge runtime
    return inngestRoute(request);
  }

  const routeHandler = routes[`${method} ${pathname}`];

  if (!routeHandler) {
    return new Response(null, { status: 404 });
  }

  return routeHandler(request, context);
};

export const elba = <T extends TableColumns>(
  config: ElbaConfig<T>
): Record<HTTPMethod, typeof handler> => ({
  GET: (req) => handler<T>(req, config),
  POST: (req) => handler<T>(req, config),
  PUT: (req) => handler<T>(req, config),
});
