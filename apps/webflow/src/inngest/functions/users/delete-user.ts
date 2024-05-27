import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/common/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { inngest } from '../../client';

export const deleteWebflowUser = inngest.createFunction(
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
    const { id, organisationId } = event.data;

    // retrieve the Webflow organisation access token and site Id
    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: Organisation.accessToken,
          siteId: Organisation.siteId,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    await step.run('delete-user', async () => {
      await deleteUser(organisation.accessToken, organisation.siteId, id);
    });
  }
);
