import { getPagesWithRestrictions } from '@/connectors/confluence/pages';
import { inngest } from '@/inngest/client';
import { formatPageObject } from '@/connectors/elba/data-protection/objects';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { getOrganisation } from '../../common/organisations';

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
    const { organisationId, cursor, syncStartedAt, isFirstSync } = event.data;

    const organisation = await step.run('get-organisation', () => getOrganisation(organisationId));

    const elba = createElbaClient(organisation.id, organisation.region);

    const nextCursor = await step.run('paginate-pages', async () => {
      const result = await getPagesWithRestrictions({
        accessToken: await decrypt(organisation.accessToken),
        instanceId: organisation.instanceId,
        cursor,
        limit: env.DATA_PROTECTION_PAGES_BATCH_SIZE,
      });
      const objects = result.pages
        .map((page) =>
          formatPageObject(page, {
            instanceUrl: organisation.instanceUrl,
            instanceId: organisation.instanceId,
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
