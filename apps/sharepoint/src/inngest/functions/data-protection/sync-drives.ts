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
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
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

    const { drives, nextSkipToken } = await step.run('paginate', async () => {
      const result = await getDrives({
        token,
        siteId,
        skipToken,
      });

      return result;
    });

    if (drives.length) {
      const eventsWait = drives.map(({ id }) =>
        step.waitForEvent(`wait-for-items-complete-${id}`, {
          event: 'sharepoint/items.sync.completed',
          timeout: '1d',
          if: `async.data.organisationId == '${organisationId}' && async.data.driveId == '${id}'`,
        })
      );

      await step.sendEvent(
        'items-sync-triggered',
        drives.map(({ id }) => ({
          name: 'sharepoint/items.sync.triggered',
          data: {
            siteId,
            driveId: id,
            isFirstSync,
            folder: null,
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

      return {
        status: 'ongoing',
      };
    }

    await step.sendEvent('drives-sync-complete', {
      name: 'sharepoint/drives.sync.completed',
      data: {
        organisationId,
        siteId,
      },
    });

    return {
      status: 'completed',
    };
  }
);
