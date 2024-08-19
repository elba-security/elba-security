import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { getDrives } from '@/connectors/microsoft/sharepoint/drives';
import { env } from '@/common/env';

export const syncDrives = inngest.createFunction(
  {
    id: 'sharepoint-sync-drives',
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
    onFailure: async ({ event, step }) => {
      const { organisationId, siteId } = event.data.event.data;

      await step.sendEvent('drives-sync-failed', {
        name: 'sharepoint/drives.sync.completed',
        data: { organisationId, siteId },
      });
    },
    retries: 5,
  },
  { event: 'sharepoint/drives.sync.triggered' },
  async ({ event, step }) => {
    const { siteId, isFirstSync, skipToken, organisationId } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const token = await decrypt(organisation.token);

    const { driveIds, nextSkipToken } = await step.run('paginate', async () => {
      const result = await getDrives({
        token,
        siteId,
        skipToken,
      });

      return result;
    });

    if (driveIds.length) {
      const eventsWait = driveIds.map((id) =>
        step.waitForEvent(`wait-for-items-complete-${id}`, {
          event: 'sharepoint/items.sync.completed',
          timeout: '30d',
          if: `async.data.organisationId == '${organisationId}' && async.data.driveId == '${id}' && async.data.folderId == null`,
        })
      );

      await step.sendEvent(
        'items-sync-triggered',
        driveIds.map((id) => ({
          name: 'sharepoint/items.sync.triggered',
          data: {
            siteId,
            driveId: id,
            isFirstSync,
            folderId: null,
            permissionIds: [],
            skipToken: null,
            organisationId,
          },
        }))
      );

      await Promise.all(eventsWait);
    }

    if (nextSkipToken) {
      await step.sendEvent('sync-next-drives-page', {
        name: 'sharepoint/drives.sync.triggered',
        data: {
          ...event.data,
          skipToken: nextSkipToken,
        },
      });

      return { status: 'ongoing' };
    }

    await step.sendEvent('drives-sync-complete', {
      name: 'sharepoint/drives.sync.completed',
      data: { organisationId, siteId },
    });

    return { status: 'completed' };
  }
);
