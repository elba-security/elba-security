import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/common/env';
import { organisationsTable } from '@/database/schema';
import { deleteUser as deleteWebflowUser } from '@/connectors/webflow/users';
import { decrypt } from '@/common/crypto';
import { getSiteIds } from '@/connectors/webflow/sites';
import { inngest } from '@/inngest/client';

export const deleteUsers = inngest.createFunction(
  {
    id: 'webflow-delete-user',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.WEBFLOW_DELETE_USER_CONCURRENCY,
    },
    retries: 5,
  },
  {
    event: 'webflow/users.delete.requested',
  },
  async ({ event, step }) => {
    const { userId, organisationId } = event.data;

    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: organisationsTable.accessToken,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));

      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      return result;
    });

    const token = await decrypt(organisation.accessToken);

    const siteIds = await step.run('get-site-ids', async () => {
      const result = await getSiteIds(token);
      return result;
    });

    await Promise.all(
      siteIds.map((siteId) => {
        return step.run('delete-user', async () => {
          await deleteWebflowUser(token, siteId, userId);
        });
      })
    );
  }
);
