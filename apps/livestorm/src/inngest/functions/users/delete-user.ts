import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { inngest } from '../../client';

export const deleteLivestormUser = inngest.createFunction(
  {
    id: 'livestorm-delete-user',
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
  },
  {
    event: 'livestorm/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id, organisationId } = event.data as {
      id: string;
      organisationId: string;
    };
    const organisation = await step.run('get-organisation', async () => {
      const [row] = await db
        .select({
          token: Organisation.token,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!row) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return row;
    });

    await step.run('delete-user', async () => {
      await deleteUser(organisation.token, id);
    });
  }
);
