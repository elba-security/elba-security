import { serve } from 'inngest/next';
import type { InngestFunction } from 'inngest';
import type { NextApiResponse } from 'next';
import type { NextRequest } from 'next/server';
import type { Config } from './config';
import type { CoreElbaInngest } from './inngest/client';
import { createInngest } from './inngest/client';
import { createAuthRoute } from './routes/auth';
import { createSyncUsers } from './inngest/functions/users/sync-users';
import { createRefreshToken } from './inngest/functions/token/refresh-token';
import type { CreateElbaRouteHandler } from './routes/types';
import { createInstallRoute } from './routes/install';

type MakeServeParams<T extends string> = {
  inngest: CoreElbaInngest<T>;
  config: Config;
};

const getInngestFunctions = <T extends string>(config: Config<T>, inngest: CoreElbaInngest<T>) => {
  const functions: InngestFunction.Any[] = config.inngestFunctions ?? [];
  if (config.features?.users?.getUsers) {
    functions.push(createSyncUsers({ inngest, config }));
  }
  if (config.features?.token?.refreshToken) {
    functions.push(createRefreshToken({ inngest, config }));
  }
  return functions;
};

const elbaRoutes: Record<
  string,
  {
    checkEnabled: (config: Config) => boolean;
    method: 'GET' | 'DELETE' | 'POST' | 'PUT';
    createRoute: CreateElbaRouteHandler;
  }
> = {
  '/auth': {
    method: 'GET',
    checkEnabled: (config) => Boolean(config.routes?.auth),
    createRoute: createAuthRoute,
  },
  '/install': {
    method: 'GET',
    checkEnabled: (config) => Boolean(config.routes?.install),
    createRoute: createInstallRoute,
  },
};

const makeServe =
  <T extends string>({ inngest, config }: MakeServeParams<T>) =>
  () => {
    const routeHandler = (request: NextRequest, response: NextApiResponse) => {
      const url = new URL(request.url);
      if (url.pathname === 'api/inngest') {
        const inngestRouteHandlers = serve({
          client: inngest,
          functions: getInngestFunctions(config, inngest),
          streaming: 'allow',
        });
        return inngestRouteHandlers[request.method as 'GET' | 'POST' | 'PUT'](request, response);
      }

      const elbaRoute = elbaRoutes[url.pathname];
      if (elbaRoute && elbaRoute.method === request.method && elbaRoute.checkEnabled(config)) {
        return elbaRoute.createRoute(config, inngest)(request);
      }

      return new Response(null, { status: 404 });
    };

    return {
      GET: routeHandler,
      POST: routeHandler,
      PUT: routeHandler,
      DELETE: routeHandler,
    };
  };

export default function init<Id extends string>(
  config: Config<Id>,
  inngest: CoreElbaInngest<Id> = createInngest(config.id)
) {
  return {
    inngest,
    serve: makeServe({ inngest, config }),
  };
}
