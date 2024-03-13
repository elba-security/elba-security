import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { inngest } from '../../client';

export const deleteHerokuUser = inngest.createFunction(
  {
    id: 'heroku-delete-user',
    priority: {
      run: '600',
    },
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'heroku/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id, organisationId } = event.data;

    // retrieve the Heroku organisation access token and team Id
    const [accessToken, teamId] = await step.run('get-access-token', async () => {
      const [organisation] = await db
        .select({
          accessToken: Organisation.accessToken,
          teamId: Organisation.teamId,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return [organisation.accessToken, organisation.teamId];
    });

    if (accessToken && teamId) {
      await step.run('delete-user', async () => {
        await deleteUser(accessToken, teamId, id);
      });
    }

    return {
      status: 'completed',
    };
  }
);
