import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, sharePointTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { getDeltaItems } from '@/connectors/microsoft/delta/get-delta';
import { createElbaClient } from '@/connectors/elba/client';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import {
  formatDataProtectionObjects,
  getChunkedArray,
  getItemsWithPermissionsFromChunks,
  removeInheritedUpdate,
} from './common/helpers';

export const updateItems = inngest.createFunction(
  {
    id: 'sharepoint-update-items',
    concurrency: {
      // TODO: concurrency 1
      key: 'event.data.tenantId',
      limit: env.MICROSOFT_DATA_PROTECTION_ITEMS_SYNC_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'sharepoint/update-items.triggered' },
  async ({ event, step }) => {
    const { siteId, driveId, subscriptionId, tenantId } = event.data;

    const [record] = await db
      .select({
        organisationId: organisationsTable.id,
        token: organisationsTable.token,
        region: organisationsTable.region,
        delta: sharePointTable.delta,
      })
      .from(sharePointTable)
      .innerJoin(organisationsTable, eq(sharePointTable.organisationId, organisationsTable.id))
      .where(
        and(
          eq(organisationsTable.tenantId, tenantId),
          eq(sharePointTable.siteId, siteId),
          eq(sharePointTable.driveId, driveId),
          eq(sharePointTable.subscriptionId, subscriptionId)
        )
      );

    if (!record) {
      throw new NonRetriableError(`Could not retrieve organisation with tenantId=${tenantId}`);
    }

    const { items, ...tokens } = await step.run('delta-paginate', async () => {
      const result = await getDeltaItems({
        token: await decrypt(record.token),
        siteId,
        driveId,
        deltaToken: record.delta,
      });

      await db
        .update(sharePointTable)
        .set({
          delta: 'newDeltaToken' in result ? result.newDeltaToken : result.nextSkipToken,
        })
        .where(
          and(
            eq(sharePointTable.organisationId, record.organisationId),
            eq(sharePointTable.siteId, siteId),
            eq(sharePointTable.driveId, driveId),
            eq(sharePointTable.subscriptionId, subscriptionId)
          )
        );

      return result;
    });

    const elba = createElbaClient({ organisationId: record.organisationId, region: record.region });

    if (items.updated.length) {
      await step.run('update-elba-items', async () => {
        const itemsChunks = getChunkedArray<MicrosoftDriveItem>(
          items.updated,
          env.MICROSOFT_DATA_PROTECTION_ITEM_PERMISSIONS_CHUNK_SIZE
        );

        const itemsWithPermissions = await getItemsWithPermissionsFromChunks({
          itemsChunks,
          token: await decrypt(record.token),
          siteId,
          driveId,
        });

        // console.log(JSON.stringify({ itemsWithPermissions }, null, 2));
        const { toDelete, toUpdate } = removeInheritedUpdate(itemsWithPermissions);
        // TODO: handle toDelete? Either update every one of them either remove them

        // console.log(JSON.stringify({ toDelete, toUpdate }, null, 2));

        const dataProtectionItems = formatDataProtectionObjects({
          items: toUpdate,
          siteId,
          driveId,
          parentPermissionIds: [], // TODO
        });

        // console.log(JSON.stringify({ dataProtectionItems }, null, 2));

        await elba.dataProtection.updateObjects({ objects: dataProtectionItems });
      });
    }

    if (items.deleted.length) {
      await step.run('remove-elba-items', async () => {
        await elba.dataProtection.deleteObjects({ ids: items.deleted });
      });
    }

    if ('nextSkipToken' in tokens) {
      await step.sendEvent('sync-next-delta-page', {
        name: 'sharepoint/update-items.triggered',
        data: event.data,
      });

      return { status: 'ongoing' };
    }

    return { status: 'completed' };
  }
);
