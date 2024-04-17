import { serve } from 'inngest/next';
import type { Inngest, InngestFunction } from 'inngest';
import type { NextApiResponse } from 'next';
import type { NextRequest } from 'next/server';
import type { PgTableWithColumns, TableConfig } from 'drizzle-orm/pg-core';
import type { BaseElbaOrganisation, Config } from './config';
import type { ElbaInngest } from './inngest/client';
import { createInngest } from './inngest/client';
import { createInstallRoute } from './routes/install';
import { createOauthRoute } from './routes/oauth';

type MakeServeParams = {
  inngest: Inngest<any>;
  config: Config<string>;
};

const getInngestFunctionFromConfig = (config: Config<string>) => {
  const functions: InngestFunction.Any[] = [];
  if (config.features?.users) {
    functions.push();
  }

  return functions;
};

const makeServe =
  ({ inngest, config }: MakeServeParams) =>
  () => {
    const routeHandler = (request: NextRequest, response: NextApiResponse) => {
      const url = new URL(request.url);
      if (url.pathname === 'api/inngest') {
        const inngestRouteHandlers = serve({
          client: inngest,
          functions: config.inngestFunctions || [],
          streaming: 'allow',
        });
        return inngestRouteHandlers[request.method as 'GET' | 'POST' | 'PUT'](request, response);
      }
      // if (request.method === 'GET' && config.routes?.install && url.pathname === '/install') {
      //   return createInstallRoute({
      //     url: config.routes.install.redirectUrl,
      //     sourceId: config.sourceId,
      //     baseUrl: config.elbaRedirectUrl,
      //   })(request);
      // }
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

const filterFields = <T extends Record<string, unknown>>(
  data: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- convenience
  table: PgTableWithColumns<any>
) => {
  const filteredData: Record<string, unknown> = {};
  for (const key in data) {
    if (!['id', 'region', 'createdAt'].includes(key) && key in table._.columns) {
      filteredData[key] = data[key];
    }
  }
  return filteredData as Partial<T>;
};

export default async function init<Id extends string>(
  config: Config<Id>,
  inngest: ElbaInngest<Id> = createInngest(config.id)
) {
  if (config.routes?.auth) {
    const { searchParamsSchema, handle } = config.routes.auth;
    const params = searchParamsSchema.parse({ foo: 'bar' });
    const { organisation, tokenExpiresIn } = handle(params);
    const partialOrganisation = filterFields(organisation, config.db.organisations);

    await config.db.client
      .insert(config.db.organisations)
      .values({
        ...partialOrganisation,
        id: 'toast',
        region: 'dede',
      })
      .onConflictDoUpdate({
        target: config.db.organisations.id,
        set: partialOrganisation,
      });

    if (tokenExpiresIn) {
      // send event to refresh token
    }
    if (config.features?.users) {
      // send event to sync users
    }
  }

  if (config.features?.users) {
    const { getUsers } = config.features.users;
    const [row] = await config.db.client.select().from(config.db.organisations);
    if (row) {
      getUsers(row, null);
    }
  }

  return {
    config,
    inngest,
    serve: makeServe({ inngest, config }),
  };
}
