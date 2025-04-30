import { getPagesWithRestrictions } from '@/connectors/confluence/pages';
import { inngest } from '@/inngest/client';
import { formatPageObject } from '@/connectors/elba/data-protection/objects';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';
import { getInstance } from '@/connectors/confluence/auth';

export const syncPages = inngest.createFunction(
  {
    id: 'confluence-sync-pages',
    cancelOn: [
      {
        event: 'confluence/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'confluence/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'confluence/sync.cancel',
        match: 'data.organisationId',
      },
    ],
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.DATA_PROTECTION_SYNC_PAGES_MAX_RETRY,
  },
  {
    event: 'confluence/data_protection.pages.sync.requested',
  },
  async ({ event, step }) => {
    const { organisationId, cursor, syncStartedAt, isFirstSync, nangoConnectionId, region } =
      event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');
    const instance = await getInstance(credentials.access_token);

    const elba = createElbaOrganisationClient({ organisationId, region });
    const accessToken = credentials.access_token;

    const nextCursor = await step.run('paginate-pages', async () => {
      const result = await getPagesWithRestrictions({
        accessToken,
        instanceId: instance.id,
        cursor,
        limit: env.DATA_PROTECTION_PAGES_BATCH_SIZE,
      });
      const objects = result.pages
        .map((page) =>
          formatPageObject(page, {
            instanceUrl: instance.url,
            instanceId: instance.id,
          })
        )
        .filter((object) => object.permissions.length > 0);

      await elba.dataProtection.updateObjects({ objects });

      return result.cursor;
    });

    if (nextCursor) {
      await step.sendEvent('request-next-pages-sync', {
        name: 'confluence/data_protection.pages.sync.requested',
        data: {
          nangoConnectionId,
          region,
          organisationId,
          isFirstSync,
          syncStartedAt,
          cursor: nextCursor,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    await elba.dataProtection.deleteObjects({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });

    return {
      status: 'completed',
    };
  }
);
