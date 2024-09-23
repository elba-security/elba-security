import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import {
  getAllItemPermissions,
  type OnedrivePermission,
} from '@/connectors/microsoft/onedrive/permissions';
import { formatDataProtectionObjects } from '@/connectors/elba/data-protection';
import { getDeltaItems } from '@/connectors/microsoft/delta/delta';
import { createSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { type MicrosoftDriveItem } from '@/connectors/microsoft/onedrive/items';
import { parseItemsInheritedPermissions } from './common/helpers';

export const syncItems = inngest.createFunction(
  {
    id: 'onedrive-sync-items',
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.MICROSOFT_DATA_PROTECTION_ITEMS_SYNC_CONCURRENCY,
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
    onFailure: async ({ event, step }) => {
      const { organisationId, userId } = event.data.event.data;

      await step.sendEvent('items-sync-failed', {
        name: 'onedrive/items.sync.completed',
        data: { organisationId, userId },
      });
    },
    retries: 5,
  },
  { event: 'onedrive/items.sync.triggered' },
  async ({ event, step }) => {
    const { userId, skipToken, organisationId } = event.data;

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

    const token = await decrypt(organisation.token);

    // TODO: make sure to handle force resync from microsoft
    const result = await step.run('get-items', async () =>
      getDeltaItems({ token, userId, deltaToken: skipToken })
    );

    // Ignore if user doesn't have a drive
    if (!result) {
      await step.sendEvent('items-sync-completed', {
        name: 'onedrive/items.sync.completed',
        data: { organisationId, userId },
      });

      return { status: 'ignored' };
    }

    const { items, ...tokens } = result;
    const itemIds = new Set<string>();
    const sharedItems: MicrosoftDriveItem[] = [];
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
      permissions = await step.run('get-permissions', async () =>
        Promise.all(
          [...itemIds.values()].map(async (itemId) => {
            const itemPermissions = await getAllItemPermissions({ token, userId, itemId });
            return [itemId, itemPermissions] as const;
          })
        )
      );
    }

    const itemIdsPermissions = new Map(
      permissions.map(([itemId, itemPermissions]) => [
        itemId,
        new Map(itemPermissions.map((permission) => [permission.id, permission])),
      ])
    );

    const parsedItems = parseItemsInheritedPermissions(sharedItems, itemIdsPermissions);

    const elba = createElbaClient({ organisationId, region: organisation.region });

    if (items.deleted.length) {
      await step.run('delete-elba-objects', async () =>
        elba.dataProtection.deleteObjects({
          ids: items.deleted,
        })
      );
    }

    if (parsedItems.toUpdate.length) {
      await step.run('update-elba-objects', async () => {
        const { toUpdate: dataProtectionObjects } = formatDataProtectionObjects({
          items: parsedItems.toUpdate,
          userId,
          parentPermissionIds: [],
        });

        if (dataProtectionObjects.length) {
          await elba.dataProtection.updateObjects({ objects: dataProtectionObjects });
        }
      });
    }

    if ('nextSkipToken' in tokens) {
      await step.sendEvent('sync-next-items-page', {
        name: 'onedrive/items.sync.triggered',
        data: {
          ...event.data,
          skipToken: tokens.nextSkipToken,
        },
      });

      return { status: 'ongoing' };
    }

    await step.run('create-subscription', async () => {
      const {
        id: subscriptionId,
        expirationDateTime,
        clientState,
      } = await createSubscription({
        token,
        changeType: 'updated',
        resource: `users/${userId}/drive/root`,
        clientState: crypto.randomUUID(),
      });

      await db
        .insert(subscriptionsTable)
        .values({
          organisationId,
          userId,
          subscriptionId,
          subscriptionExpirationDate: expirationDateTime,
          subscriptionClientState: clientState,
          delta: tokens.newDeltaToken,
        })
        .onConflictDoUpdate({
          target: [subscriptionsTable.organisationId, subscriptionsTable.userId],
          set: {
            subscriptionId,
            subscriptionExpirationDate: expirationDateTime,
            subscriptionClientState: clientState,
            delta: tokens.newDeltaToken,
          },
        });
    });

    await step.sendEvent('items-sync-completed', {
      name: 'onedrive/items.sync.completed',
      data: { organisationId, userId },
    });

    return { status: 'completed' };
  }
);
