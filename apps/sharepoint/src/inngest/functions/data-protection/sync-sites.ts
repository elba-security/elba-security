import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getSites } from '@/connectors/microsoft/sharepoint/sites';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';

export const syncSites = inngest.createFunction(
  {
    id: 'sharepoint-synchronize-data-protection-objects',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.MICROSOFT_DATA_PROTECTION_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'sharepoint/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'sharepoint/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'sharepoint/data_protection.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, isFirstSync, skipToken, syncStartedAt } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { siteIds, nextSkipToken } = await step.run('paginate', async () => {
      const result = await getSites({
        token: await decrypt(organisation.token),
        skipToken,
      });

      return result;
    });

    if (siteIds.length) {
      const eventsWait = siteIds.map((id) =>
        step.waitForEvent(`wait-for-drives-complete-${id}`, {
          event: 'sharepoint/drives.sync.completed',
          timeout: '30d',
          if: `async.data.organisationId == '${organisationId}' && async.data.siteId == '${id}'`,
        })
      );

      await step.sendEvent(
        'drives-sync-triggered',
        siteIds.map((id) => ({
          name: 'sharepoint/drives.sync.triggered',
          data: {
            siteId: id,
            isFirstSync,
            skipToken: null,
            organisationId,
          },
        }))
      );

      await Promise.all(eventsWait);
    }

    if (nextSkipToken) {
      await step.sendEvent('sync-next-sites-page', {
        name: 'sharepoint/data_protection.sync.requested',
        data: {
          organisationId,
          isFirstSync,
          syncStartedAt,
          skipToken: nextSkipToken,
        },
      });

      return { status: 'ongoing' };
    }

    await step.run('elba-permissions-delete', async () => {
      const elba = createElbaClient({ organisationId, region: organisation.region });

      await elba.dataProtection.deleteObjects({
        syncedBefore: new Date(syncStartedAt).toISOString(),
      });
    });

    return { status: 'completed' };
  }
);
