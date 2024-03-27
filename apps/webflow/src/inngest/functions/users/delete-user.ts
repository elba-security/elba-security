import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/users';
import { inngest } from '../../client';

export const deleteWebflowUser = inngest.createFunction(
  {
    id: 'webflow-delete-user',
    priority: {
      run: '600',
    },
    retries: env.REMOVE_ORGANISATION_MAX_RETRY,
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
