import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteDatadogUser } from '@/connectors/datadog/users';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';
import { credentialsRawSchema } from './sync-users';

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

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);

    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new NonRetriableError('Could not retrieve Nango credentials');
    }
    const rawData = credentialsRawSchema.safeParse(credentials.raw);
    if (!rawData.success) {
      throw new NonRetriableError(`Nango credentials.raw is invalid`);
    }
    await deleteDatadogUser({
      userId,
      apiKey: rawData.data.apiKey,
      appKey: rawData.data.appKey,
      sourceRegion: rawData.data.sourceRegion,
    });
  }
);
