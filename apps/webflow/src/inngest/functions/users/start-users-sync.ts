import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';
import { getSiteIds } from '@/connectors/webflow/sites';
import { decrypt } from '@/common/crypto';

export const syncUsers = inngest.createFunction(
  {
    id: 'webflow-start-sync-users',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
    cancelOn: [
      {
        event: 'webflow/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'webflow/users.start_sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt } = event.data;

    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: organisationsTable.accessToken,
          region: organisationsTable.region,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.accessToken);

    const siteIds = await step.run('get-site-ids', async () => {
      const result = await getSiteIds(token);
      return result;
    });

    if (siteIds.length > 0) {
      const eventsToWait = siteIds.map(async (siteId) => {
        await step.waitForEvent(`wait-sync-site-users-${siteId}`, {
          event: 'webflow/users.sync.completed',
          timeout: '1 day',
          if: `event.data.organisationId == '${organisationId}' && event.data.siteId == '${siteId}'`,
        });
      });

      await step.sendEvent(
        'sync-users',
        siteIds.map((siteId) => ({
          name: 'webflow/users.sync.requested',
          data: {
            organisationId,
            siteId,
            page: 0,
          },
        }))
      );
      await Promise.all(eventsToWait);
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
