import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { Elba } from '@elba-security/sdk';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getSites } from '../../../connectors/share-point/sites';

export const syncSites = inngest.createFunction(
  {
    id: 'synchronize-data-protection-objects',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
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
  { event: 'one-drive/data_protection.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, isFirstSync, skipToken, syncStartedAt } = event.data;

    logger.info('Sync Start');

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

    const { sites, nextSkipToken } = await step.run('paginate', async () => {
      const result = await getSites({
        token: await decrypt(organisation.token),
        skipToken,
      });

      return result;
    });

    logger.info('SITE SYNC DRIVES');

    if (sites.length) {
      const eventsWait = sites.map(({ id }) => {
        return step.waitForEvent(`wait-for-drives-complete-${id}`, {
          event: 'one-drive/drives.sync.completed',
          timeout: '1d',
          if: `async.data.organisationId == '${organisationId}' && async.data.siteId == '${id}'`,
        });
      });

      await step.sendEvent(
        'drives-sync-triggered',
        sites.map(({ id }) => ({
          name: 'one-drive/drives.sync.triggered',
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
      logger.info('SITE PAGINATE');
      await step.sendEvent('sync-next-sites-page', {
        name: 'one-drive/data_protection.sync.requested',
        data: {
          organisationId,
          isFirstSync,
          syncStartedAt,
          skipToken: nextSkipToken,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    await step.run('elba-permissions-delete', async () => {
      logger.info('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀 ~ elba-permissions-delete');

      const elba = new Elba({
        organisationId,
        apiKey: env.ELBA_API_KEY,
        baseUrl: env.ELBA_API_BASE_URL,
        region: organisation.region,
      });

      await elba.dataProtection.deleteObjects({
        syncedBefore: new Date(syncStartedAt).toISOString(),
      });
    });

    return {
      status: 'completed',
    };
  }
);
