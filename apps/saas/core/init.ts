import { serve } from 'inngest/next';
import type { InngestFunction } from 'inngest';
import type { NextApiResponse } from 'next';
import type { NextRequest } from 'next/server';
import type { z } from 'zod';
import type { BaseElbaOrganisation, Config } from './config';
import { getInngestFunctions } from './inngest/functions';
import type { ElbaInngest } from './inngest/client';
import { createClient } from './inngest/client';
import { createInstallRoute } from './routes/install';
import { createOauthRoute } from './routes/oauth';

type MakeServeParams<Organisation extends BaseElbaOrganisation> = {
  inngest: ElbaInngest;
  inngestFunctions: InngestFunction.Any[];
  config: Config<Organisation>;
};

const makeServe =
  <Organisation extends BaseElbaOrganisation>({
    inngest,
    inngestFunctions,
    config,
  }: MakeServeParams<Organisation>) =>
  () => {
    const routeHandler = (request: NextRequest, response: NextApiResponse) => {
      const url = new URL(request.url);
      if (url.pathname === 'api/inngest') {
        const inngestRouteHandlers = serve({
          client: inngest,
          functions: inngestFunctions,
          streaming: 'allow',
        });
        return inngestRouteHandlers[request.method as 'GET' | 'POST' | 'PUT'](request, response);
      }
      if (request.method === 'GET' && config.routes?.install && url.pathname === '/install') {
        return createInstallRoute({
          url: config.routes.install.redirectUrl,
          sourceId: config.sourceId,
          baseUrl: config.elbaRedirectUrl,
        })(request);
      }
      if (request.method === 'GET' && config.routes?.auth && url.pathname === '/auth') {
        return createOauthRoute(config, inngest)(request);
      }
      return new Response(null, { status: 404 });
    };

    return {
      GET: routeHandler,
      POST: routeHandler,
      PUT: routeHandler,
    };
  };

export default function init<
  Organisation extends BaseElbaOrganisation,
  AuthSearchParamsSchema extends z.AnyZodObject = z.AnyZodObject,
>(config: Config<Organisation, AuthSearchParamsSchema>) {
  const inngest = createClient(config.id);

  return {
    inngest,
    serve: makeServe<Organisation>({
      inngest,
      inngestFunctions: getInngestFunctions({ inngest, config }),
      config,
    }),
  };
}
