import { inngest } from '@/inngest/client';
import { deleteUser as deleteDiscourseUser } from '@/connectors/discourse/users';
import { nangoConnectionConfigSchema, nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'discourse-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.DISCOURSE_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'discourse/users.delete.requested' },
  async ({ event }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials, connection_config: connectionConfig } =
      await nangoAPIClient.getConnection(nangoConnectionId);

    const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);

    if (!nangoCredentialsResult.success) {
      throw new Error('Could not retrieve Nango credentials');
    }

    const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);

    if (!nangoConnectionConfigResult.success) {
      throw new Error('Could not retrieve Nango connection config data');
    }

    const defaultHost = nangoConnectionConfigResult.data.defaultHost;
    await deleteDiscourseUser({
      apiKey: nangoCredentialsResult.data.apiKey,
      defaultHost,
      apiUsername: nangoConnectionConfigResult.data.apiUsername,
      userId,
    });
  }
);
