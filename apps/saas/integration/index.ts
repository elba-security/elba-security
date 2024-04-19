import { z } from 'zod';
import init from '../core/init';
import { createInngest } from '../core/inngest/client';
import type { AuthRouteConfig, UsersFeatureConfig } from '../core/config';
import { databaseClient, organisationsTable } from './database';

const searchParamsSchema = z.object({
  code: z.string(),
});

// type A = typeof searchParamsSchema extends z.ZodSchema<SeachParamsSchemaOutput>

const inngest = createInngest<
  'toast',
  {
    'foo/bar': {
      data: {
        baz: boolean;
      };
    };
  }
>('toast');

const authRouteConfig: AuthRouteConfig<
  typeof organisationsTable,
  typeof searchParamsSchema,
  typeof inngest
> = {
  searchParamsSchema,
  withState: true,
  handle: async ({ code }) => ({
    organisation: {
      token: '',
    },
    tokenExpiresIn: 3600,
  }),
  experimental_emitEvents: (organisation) => ({
    name: 'foo/bar',
    data: {
      baz: true,
      id: organisation.token,
    },
  }),
};

const usersFeature: UsersFeatureConfig<typeof organisationsTable> = {
  getUsers: async (organisation, cursor) => {
    return {
      users: [],
      nextCursor: null,
    };
  },
};

export const integration = init(
  {
    id: 'toast',
    elba: {
      apiKey: 'api-key',
      redirectUrl: 'https://foo.bar',
      sourceId: 'some-client-id',
    },
    database: {
      db: databaseClient,
      organisationsTable,
      encryption: {
        key: 'FOO_BAR',
        encryptedKeys: ['accessToken'],
      },
    },
    routes: {
      auth: authRouteConfig,
    },
    features: {
      users: usersFeature,
    },
  },
  inngest
);

await inngest.send({
  name: 'foo/bar',
  data: {
    baz: true,
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
