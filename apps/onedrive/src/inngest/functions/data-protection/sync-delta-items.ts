import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { getDeltaItems } from '@/connectors/microsoft/delta/delta';
import { createElbaClient } from '@/connectors/elba/client';
import { formatDataProtectionObjects } from '@/connectors/elba/data-protection';
import {
  getAllItemPermissions,
  type OnedrivePermission,
} from '@/connectors/microsoft/onedrive/permissions';
import { type MicrosoftDriveItem } from '@/connectors/microsoft/onedrive/items';
import { parseItemsInheritedPermissions } from './common/helpers';

export const syncDeltaItems = inngest.createFunction(
  {
    id: 'onedrive-sync-delta-items',
    concurrency: {
      key: 'event.data.tenantId',
      limit: env.MICROSOFT_DATA_PROTECTION_ITEMS_SYNC_CONCURRENCY,
    },
    retries: 5,
  },
  { event: 'onedrive/delta.sync.triggered' },
  async ({ event, step }) => {
    const { userId, subscriptionId, tenantId } = event.data;

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
          eq(subscriptionsTable.userId, userId),
          eq(subscriptionsTable.subscriptionId, subscriptionId)
        )
      );

    if (!record) {
      throw new NonRetriableError(`Could not retrieve organisation with tenantId=${tenantId}`);
    }

    const token = await decrypt(record.token);
    const { items, ...tokens } = await step.run('fetch-delta-items', async () => {
      const result = await getDeltaItems({
        token,
        userId,
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
            eq(subscriptionsTable.userId, userId),
            eq(subscriptionsTable.subscriptionId, subscriptionId)
          )
        );

      return result;
    });

    const sharedItems: MicrosoftDriveItem[] = [];
    const itemIds = new Set<string>();
    for (const item of items.updated) {
      if (item.shared) {
        sharedItems.push(item);
        itemIds.add(item.id);
        if (item.parentReference.id) {
          itemIds.add(item.parentReference.id);
        }
      }
    }

    let permissions: [string, OnedrivePermission[]][] = [];
    if (itemIds.size) {
      permissions = await step.run('get-permissions', async () => {
        return Promise.all(
          [...itemIds.values()].map(async (itemId) => {
            const itemPermissions = await getAllItemPermissions({ token, userId, itemId });

            const filteredPermissions = itemPermissions.filter(
              (permission) => !permission.roles.includes('owner')
            );

            return [itemId, filteredPermissions] as const;
          })
        );
      });
    }

    const itemIdsPermissions = new Map(
      permissions.map(([itemId, itemPermissions]) => [
        itemId,
        new Map(itemPermissions.map((permission) => [permission.id, permission])),
      ])
    );

    const parsedItems = parseItemsInheritedPermissions(items.updated, itemIdsPermissions);

    const dataProtectionObjects = formatDataProtectionObjects({
      items: parsedItems.toUpdate,
      userId,
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
        name: 'onedrive/delta.sync.triggered',
        data: event.data,
      });

      return { status: 'ongoing' };
    }

    return { status: 'completed' };
  }
);
