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
import { InferSelectModel, sql } from 'drizzle-orm';
import { PgInsertValue, TableConfig } from 'drizzle-orm/pg-core';
import { ElbaOrganisationsTableBaseKeys, createDb, organisationsTable } from './database';

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

export default async function init<
  Id extends string,
  OrganisationsTable extends typeof organisationsTable,
>(config: Config<Id, OrganisationsTable>, inngest: ElbaInngest<Id> = createClient(config.id)) {
  const db = createDb(config.db.organisations)
  if (config.routes?.auth) {
    const { searchParamsSchema, handle } = config.routes.auth
    const params = searchParamsSchema.parse({ foo: 'bar' })
    const partialOrganisation = handle(params)

    const organisation: PgInsertValue<OrganisationsTable> = {
      id: 'org-id',
      region: 'eu',
      ...partialOrganisation,
    }

    await db
      .insert(config.db.organisations)
      .values(organisation)
      .onConflictDoUpdate({
        target: config.db.organisations.id,
        set: organisation
      })

    await config.db.organisations
  }

  if (config.features?.users) {
    const { getUsers } = config.features.users
    const [row]= await db.select().from(config.db.organisations)
    if (row)
  }

  return {
    config,
    inngest,
  };
}
