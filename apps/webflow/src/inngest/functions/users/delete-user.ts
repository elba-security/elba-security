/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable no-await-in-loop */
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { env } from '@/common/env';
import { Organisation } from '@/database/schema';
import { deleteUser } from '@/connectors/webflow/users';
import { decrypt } from '@/common/crypto';
import { getSiteIds } from '@/connectors/webflow/sites';
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
    const { ids, organisationId } = event.data;

    // retrieve the Webflow organisation access token and site Id
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

    const siteIds = await step.run('get-site-ids', async () => {
      const result = await getSiteIds(token);
      return result
    });

    for (const siteId of siteIds){
      await step.run('delete-user', async () => {
        await Promise.all(ids.map((id) => deleteUser(token, siteId, id)));
      });
    }
  }
);
