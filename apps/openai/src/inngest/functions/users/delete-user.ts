import * as usersConnector from '@/connectors/openai/users';
import { inngest } from '@/inngest/client';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';

export const deleteUser = inngest.createFunction(
  {
    id: 'openai-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 5,
    },
    retries: 5,
    cancelOn: [
      {
        event: 'openai/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'openai/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'openai/users.delete.requested',
  },
  async ({ event }) => {
    const { userId, organisationId, nangoConnectionId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
    const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);
    if (!nangoCredentialsResult.success) {
      throw new Error('Could not retrieve Nango credentials');
    }

    await usersConnector.deleteUser({
      userId,
      organizationId: organisationId,
      apiKey: nangoCredentialsResult.data.apiKey,
    });
  }
);
