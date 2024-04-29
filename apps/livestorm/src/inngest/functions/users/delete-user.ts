import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/common/env';
import { organisationsTable } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { decrypt } from '@/common/crypto';
import { inngest } from '../../client';

export const deleteLivestormUser = inngest.createFunction(
  {
    id: 'livestorm-delete-user',
    retries: 5,
    concurrency: {
      key: 'data.organisationId',
      limit: env.LIVESTORM_DELETE_USER_CONCURRENCY,
    },
  },
  {
    event: 'livestorm/users.delete.requested',
  },
  async ({ event, step }) => {
    const { id: userId, organisationId } = event.data;
    const { token } = await step.run('get-organisation', async () => {
      const [organisation] = await db
        .select({
          token: organisationsTable.token,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));
      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return organisation;
    });

    await step.run('delete-user', async () => {
      const decryptedToken = await decrypt(token);
      await deleteUser(decryptedToken, userId);
    });
  }
);
