import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { getOrganisationUserIds } from '@/connectors/microsoft/users/users';

export const syncDataProtection = inngest.createFunction(
  {
    id: 'onedrive-synchronize-data-protection-objects',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.MICROSOFT_DATA_PROTECTION_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'onedrive/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'onedrive/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'onedrive/data_protection.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, isFirstSync, skipToken, syncStartedAt } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
        region: organisationsTable.region,
        tenantId: organisationsTable.tenantId,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { userIds, nextSkipToken } = await step.run('paginate', async () => {
      const result = await getOrganisationUserIds({
        token: await decrypt(organisation.token),
        tenantId: organisation.tenantId,
        skipToken,
      });

      return result;
    });

    if (userIds.length) {
      await Promise.all([
        ...userIds.map((id) =>
          step.waitForEvent(`wait-for-items-complete-${id}`, {
            event: 'onedrive/items.sync.completed',
            timeout: '30d',
            if: `async.data.organisationId == '${organisationId}' && async.data.userId == '${id}'`,
          })
        ),
        step.sendEvent(
          'items-sync-triggered',
          userIds.map((id) => ({
            name: 'onedrive/items.sync.triggered',
            data: {
              userId: id,
              organisationId,
              isFirstSync,
              skipToken: null,
            },
          }))
        ),
      ]);
    }

    if (nextSkipToken) {
      await step.sendEvent('sync-next-page', {
        name: 'onedrive/data_protection.sync.requested',
        data: {
          organisationId,
          isFirstSync,
          syncStartedAt,
          skipToken: nextSkipToken,
        },
      });

      return { status: 'ongoing' };
    }

    await step.run('delete-elba-objects-synced-before', async () => {
      const elba = createElbaClient({ organisationId, region: organisation.region });

      await elba.dataProtection.deleteObjects({
        syncedBefore: new Date(syncStartedAt).toISOString(),
      });
    });

    return { status: 'completed' };
  }
);
