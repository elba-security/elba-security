import { inngest } from '@/inngest/client';
import { deleteUser as deleteMetabaseUser } from '@/connectors/metabase/users';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';
import { nangoConnectionConfigSchema } from '@/connectors/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'metabase-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.METABASE_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'metabase/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials, connection_config: connectionConfig } = await nangoAPIClient.getConnection(
      nangoConnectionId,
      'API_KEY'
    );
    const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);
    if (!nangoConnectionConfigResult.success) {
      throw new Error('Could not retrieve Nango connection config data');
    }

    await deleteMetabaseUser({
      userId,
      apiKey: credentials.apiKey,
      domain: nangoConnectionConfigResult.data.domain,
    });
  }
);
