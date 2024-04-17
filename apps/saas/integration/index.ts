import { z } from 'zod';
import init from '../core/init';
import { createInngest } from '../core/inngest/client';
import type { AuthRouteConfig, UsersFeatureConfig } from '../core/config';
import { databaseClient, organisations } from './database';

const searchParamsSchema = z.object({
  code: z.string(),
});

// type A = typeof searchParamsSchema extends z.ZodSchema<SeachParamsSchemaOutput>

const authRouteConfig: AuthRouteConfig<typeof organisations, typeof searchParamsSchema> = {
  searchParamsSchema,
  withState: true,
  handle: ({ code }) => ({
    organisation: {
      id: 'toast',
      token: '',
    },
    tokenExpiresIn: 3600,
  }),
};

const usersFeature: UsersFeatureConfig<typeof organisations> = {
  getUsers: (organisation, cursor) => {
    return {
      users: [],
      nextCursor: null,
    };
  },
};

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

const integration = await init(
  {
    id: 'toast',
    db: {
      client: databaseClient,
      organisations,
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
