/* eslint-disable no-await-in-loop */
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';
import { getSiteIds } from '@/connectors/webflow/sites';
import { decrypt } from '@/common/crypto';

export const syncUsers = inngest.createFunction(
    {
      id: 'webflow-sync-users',
      concurrency: {
        key: 'event.data.organisationId',
        limit: 1,
      },
      retries: 5,
      cancelOn: [
        {
          event: 'webflow/app.uninstall.requested',
          match: 'data.organisationId',
        },
      ],
    },
    { event: 'webflow/users.sync.requested' },
    async ({ event, step }) => {
      const { organisationId, syncStartedAt } = event.data;
  
      // retrieve the Webflow Organisation
      const organisation = await step.run('get-organisation', async () => {
        const [result] = await db
          .select({
            accessToken: Organisation.accessToken,
            region: Organisation.region,
          })
          .from(Organisation)
          .where(eq(Organisation.id, organisationId));
        if (!result) {
          throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
        }
        return result;
      });
  
      const elba = createElbaClient({ organisationId, region: organisation.region });
      const token = await decrypt(organisation.accessToken);

      const siteIds = await step.run('get-site-ids', async () => {
        const result = await getSiteIds(token);
        return result
      });
  
      // Process each site one by one
      for (const siteId of siteIds) {
        await step.sendEvent('sync-users-page', {
          name: 'webflow/users.page_sync.requested',
          data: {
            organisationId,
            region: organisation.region,
            isFirstSync: false,
            syncStartedAt,
            page: 0,
            siteId,
          },
        });
  
        // Wait for the sync to complete for the current site
        await step.waitForEvent(`wait-sync-site-users`, {
          event: 'webflow/users.site_sync.completed',
          timeout: '1 day',
          if: `event.data.organisationId == '${organisationId}' && event.data.siteId == '${siteId}'`,
        });
      }
  
      // Delete the elba users that have been sent before this sync
      await step.run('finalize', () =>
        elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
      );
  
      return {
        status: 'completed',
      };
    }
  );