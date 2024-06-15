/* eslint-disable no-await-in-loop */
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/clickup/users';
import { decrypt } from '@/common/crypto';
import { inngest } from '../../client';

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
    const { ids, organisationId } = event.data;

    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: Organisation.accessToken,
          teamIds: Organisation.teamIds,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    const token = await decrypt(organisation.accessToken);
    for (const teamId of organisation.teamIds){
      await step.run('delete-user', async () => {
        await Promise.all(ids.map((id) => deleteUser(token, teamId, id)));
      });
    }
  }
);
