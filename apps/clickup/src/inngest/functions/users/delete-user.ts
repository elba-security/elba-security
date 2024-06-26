import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/clickup/users';
import { decrypt } from '@/common/crypto';
import { inngest } from '../../client';
import { getTeamIds } from '@/connectors/clickup/team';

export const deleteClickUpUser = inngest.createFunction(
  {
    id: 'clickup-delete-user',
    priority: {
      run: '600',
    },
    retries: 5,
  },
  {
    event: 'clickup/users.delete.requested',
  },
  async ({ event, step }) => {
    const { userId, organisationId } = event.data;

    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: Organisation.accessToken,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    const token = await decrypt(organisation.accessToken);

    const teamIds = await step.run('get-team-ids', async () => {
      const result = await getTeamIds(token);
      return result
    });

    const deleteUserPromises = teamIds.map((teamId) =>
      step.run('delete-user', async () => {
        await deleteUser(token, teamId, userId);
      })
    );
    
    await Promise.all(deleteUserPromises);
  }
);
