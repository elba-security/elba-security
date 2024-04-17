import { eq } from 'drizzle-orm';
import { z } from 'zod';
import init from '../core/init';
import { IntegrationError } from '../core/utils/error';
import { createClient } from '../core/inngest/client';
import type { AuthRouteConfig } from '../core/config';
import { db, organisationsTable, type Organisation } from './database';

const searchParamsSchema = z.object({
  code: z.string(),
});

// type A = typeof searchParamsSchema extends z.ZodSchema<SeachParamsSchemaOutput>

const authRouteConfig: AuthRouteConfig<typeof organisationsTable, typeof searchParamsSchema> = {
  searchParamsSchema,
  handle: ({ code }) => ({
    id: 'toast',
    token: '',
  }),
};

const integration = await init({
  id: 'toast',
  db: {
    organisations: organisationsTable,
  },
  routes: {
    auth: authRouteConfig,
  },
  features: {
    users: {
      getUsers: (organisation, cursor) => {
        return {
          users: [],
        };
      },
    },
  },
});

await integration.inngest.send({
  name: 'toast/users.sync.requested',
  data: {
    organisationId: 'string',
    cursor: null,
    syncStartedAt: 0,
    isFirstSync: false,
  },
});
