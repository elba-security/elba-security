import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { deleteUser as deleteClickUpUser } from '@/connectors/clickup/users';
import { nangoAPIClient } from '@/common/nango';
import { getTeamIds } from '@/connectors/clickup/teams';

export const deleteUser = inngest.createFunction(
  {
    id: 'clickup-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 5,
    },
    retries: 5,
  },
  {
    event: 'clickup/users.delete.requested',
  },
  async ({ event, step }) => {
    const { nangoConnectionId, userId } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);

    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new NonRetriableError('Could not retrieve Nango credentials');
    }
    const token = credentials.access_token;
    const teamIds = await getTeamIds(token);

    await step.run('delete-user', async () => {
      await deleteClickUpUser({
        token,
        userId,
        teamId: teamIds[0].id,
      });
    });
  }
);
