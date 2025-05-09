import { inngest } from '@/inngest/client';
import { deleteUser as deleteFreshdeskUser } from '@/connectors/freshdesk/users';
import { nangoConnectionConfigSchema, nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';

export const deleteUser = inngest.createFunction(
  {
    id: 'freshdesk-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.FRESHDESK_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'freshdesk/users.delete.requested' },
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
    const subDomain = nangoConnectionConfigResult.data.subdomain;

    await deleteFreshdeskUser({
      userId,
      userName: nangoCredentialsResult.data.username,
      password: nangoCredentialsResult.data.password,
      subDomain,
    });
  }
);
