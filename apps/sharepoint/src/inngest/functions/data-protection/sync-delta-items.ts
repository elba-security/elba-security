import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { getDeltaItems } from '@/connectors/microsoft/delta/delta';
import { createElbaClient } from '@/connectors/elba/client';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import { formatDataProtectionObjects } from '@/connectors/elba/data-protection';
import { getAllItemPermissions } from '@/connectors/microsoft/sharepoint/permissions';
import { getChunkedArray, parseItemsInheritedPermissions } from './common/helpers';

export const syncDeltaItems = inngest.createFunction(
  {
    id: 'sharepoint-sync-delta-items',
    concurrency: {
      key: 'event.data.tenantId',
      limit: env.MICROSOFT_DATA_PROTECTION_ITEMS_SYNC_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'sharepoint/delta.sync.triggered' },
  async ({ event, step }) => {
    const { siteId, driveId, subscriptionId, tenantId } = event.data;

    const [record] = await db
      .select({
        organisationId: organisationsTable.id,
        token: organisationsTable.token,
        region: organisationsTable.region,
        delta: subscriptionsTable.delta,
      })
      .from(subscriptionsTable)
      .innerJoin(organisationsTable, eq(subscriptionsTable.organisationId, organisationsTable.id))
      .where(
        and(
          eq(organisationsTable.tenantId, tenantId),
          eq(subscriptionsTable.siteId, siteId),
          eq(subscriptionsTable.driveId, driveId),
          eq(subscriptionsTable.subscriptionId, subscriptionId)
        )
      );

    if (!record) {
      throw new NonRetriableError(`Could not retrieve organisation with tenantId=${tenantId}`);
    }

    const { items, ...tokens } = await step.run('fetch-delta-items', async () => {
      const result = await getDeltaItems({
        token: await decrypt(record.token),
        siteId,
        driveId,
        deltaToken: record.delta,
      });

      await db
        .update(subscriptionsTable)
        .set({
          delta: 'newDeltaToken' in result ? result.newDeltaToken : result.nextSkipToken,
        })
        .where(
          and(
            eq(subscriptionsTable.organisationId, record.organisationId),
            eq(subscriptionsTable.siteId, siteId),
            eq(subscriptionsTable.driveId, driveId),
            eq(subscriptionsTable.subscriptionId, subscriptionId)
          )
        );

      return result;
    });

    const itemsChunks = getChunkedArray<MicrosoftDriveItem>(
      items.updated,
      env.MICROSOFT_DATA_PROTECTION_ITEM_PERMISSIONS_CHUNK_SIZE
    );

    const itemsPermissionsChunks = await Promise.all(
      itemsChunks.map(async (itemsChunk, i) => {
        return step.run(`get-items-permissions-chunk-${i + 1}`, () => {
          return Promise.all(
            itemsChunk.map(async (item) => {
              const permissions = await getAllItemPermissions({
                token: await decrypt(record.token),
                siteId,
                driveId,
                itemId: item.id,
              });

              return { item, permissions };
            })
          );
        });
      })
    );

    const parsedItems = parseItemsInheritedPermissions(itemsPermissionsChunks.flat());

    const dataProtectionObjects = formatDataProtectionObjects({
      items: parsedItems.toUpdate,
      siteId,
      driveId,
      parentPermissionIds: [],
    });

    const itemIdsToDelete = [
      ...items.deleted,
      ...parsedItems.toDelete,
      ...dataProtectionObjects.toDelete,
    ];

    const elba = createElbaClient({ organisationId: record.organisationId, region: record.region });

    if (dataProtectionObjects.toUpdate.length) {
      await step.run('update-elba-objects', async () => {
        return elba.dataProtection.updateObjects({ objects: dataProtectionObjects.toUpdate });
      });
    }

    if (itemIdsToDelete.length) {
      await step.run('remove-elba-objects', async () => {
        return elba.dataProtection.deleteObjects({ ids: itemIdsToDelete });
      });
    }

    if ('nextSkipToken' in tokens) {
      await step.sendEvent('sync-next-delta-page', {
        name: 'sharepoint/delta.sync.triggered',
        data: event.data,
      });

      return { status: 'ongoing' };
    }

    return { status: 'completed' };
  }
);
