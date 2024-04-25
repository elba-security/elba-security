import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { Elba } from '@elba-security/sdk';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { env } from '@/env';
import { inngest } from '../../client';

export const deleteZoomUser = inngest.createFunction(
  {
    id: 'delete-user',
    priority: {
      run: '600',
    },
    retries: 1,
  },
  {
    event: 'zoom/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id, organisationId, region } = event.data;

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    const organisation = await step.run('get-token', async () => {
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
    await step.run('delete-user', async () => {
      await deleteUser(organisation.accessToken, id);
      await elba.users.delete({ ids: [id] });
    });
  }
);
