import * as usersConnector from '@/connectors/openai/users';
import { inngest } from '@/inngest/client';
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
    const { userId, nangoConnectionId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'API_KEY');
    const apiKey = credentials.apiKey;

    await usersConnector.deleteUser({
      userId,
      apiKey,
    });
  }
);
