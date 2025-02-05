import { inngest } from '@/inngest/client';
import { deleteUser as deleteDatadogUser } from '@/connectors/datadog/users';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';
import { nangoConnectionConfigSchema, nangoCredentialsSchema } from '@/connectors/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'datadog-delete-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.DATADOG_DELETE_USER_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'datadog/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'datadog/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'datadog/users.delete.requested' },
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

    await deleteDatadogUser({
      userId,
      apiKey: nangoCredentialsResult.data.apiKey,
      appKey: nangoConnectionConfigResult.data.applicationKey,
      sourceRegion: nangoConnectionConfigResult.data.siteParameter,
    });
  }
);
