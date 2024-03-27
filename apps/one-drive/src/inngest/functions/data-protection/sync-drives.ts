import { logger } from '@elba-security/logger';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { getDrives } from '../../../connectors/share-point/drives';

export const syncDrives = inngest.createFunction(
  {
    id: 'one-drive-sync-drives',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 5,
    },
    cancelOn: [
      {
        event: 'one-drive/one-drive.elba_app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'one-drive/one-drive.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.MICROSOFT_DATA_PROTECTION_SYNC_MAX_RETRY,
  },
  { event: 'one-drive/drives.sync.triggered' },
  async ({ event, step }) => {
    const { siteId, isFirstSync, skipToken, organisationId } = event.data;

    logger.info('Sync Drives');

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
      const eventsWait = drives.map(({ id }) => {
        return step.waitForEvent(`wait-for-items-complete-${id}`, {
          event: 'one-drive/items.sync.completed',
          timeout: '1d',
          if: `async.data.organisationId == '${organisationId}' && async.data.driveId == '${id}'`,
        });
      });

      await step.sendEvent(
        'items-sync-triggered',
        drives.map(({ id }) => ({
          name: 'one-drive/items.sync.triggered',
          data: {
            siteId,
            driveId: id,
            isFirstSync,
            folderId: null,
            skipToken: null,
            organisationId,
          },
        }))
      );

      await Promise.all(eventsWait);
    }

    if (nextSkipToken) {
      await step.sendEvent('sync-next-drives-page', {
        name: 'one-drive/drives.sync.triggered',
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
      name: 'one-drive/drives.sync.completed',
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
