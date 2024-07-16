import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { getItems } from '@/connectors/microsoft/sharepoint/items';
import { createElbaClient } from '@/connectors/elba/client';
import { getAllItemPermissions } from '@/connectors/microsoft/sharepoint/permissions';
import { formatDataProtectionObjects } from './common/helpers'; // TODO: move into elba connector?

export const syncItems = inngest.createFunction(
  {
    id: 'sharepoint-sync-items',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.MICROSOFT_DATA_PROTECTION_ITEMS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'sharepoint/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'sharepoint/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'sharepoint/items.sync.triggered' },
  async ({ event, step }) => {
    const { siteId, driveId, isFirstSync, folderId, permissionIds, skipToken, organisationId } =
      event.data;

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

    const { items, nextSkipToken } = await step.run('paginate', async () => {
      const result = await getItems({ token, siteId, driveId, folderId, skipToken });

      const itemsPermissions = await Promise.all(
        result.items.map(async (item) => {
          const permissions = await getAllItemPermissions({
            token,
            siteId,
            driveId,
            itemId: item.id,
          });

          return { item, permissions };
        })
      );

      // console.log(JSON.stringify(itemsPermissions, null, 2));

      return { items: itemsPermissions, nextSkipToken: result.nextSkipToken };
    });

    const folders = items.filter(({ item }) => item.folder?.childCount);
    if (folders.length) {
      const eventsToWait = folders.map(async ({ item }) =>
        step.waitForEvent(`wait-for-folders-complete-${item.id}`, {
          event: 'sharepoint/folder_items.sync.completed',
          timeout: '1d',
          if: `async.data.organisationId == '${organisationId}' && async.data.folderId == '${item.id}'`,
        })
      );

      await step.sendEvent(
        'items.sync.triggered',
        folders.map(({ item, permissions }) => ({
          name: 'sharepoint/items.sync.triggered',
          data: {
            siteId,
            driveId,
            isFirstSync,
            folderId: item.id,
            permissionIds: permissions.map(({ id }) => id),
            skipToken: null,
            organisationId,
          },
        }))
      );

      await Promise.all(eventsToWait);
    }

    // TODO: Check if parents permissions should only contains permissions ids or links ids as well
    // TODO: rename steps
    await step.run('get-permissions-update-elba', async () => {
      const dataProtectionItems = formatDataProtectionObjects({
        items,
        siteId,
        driveId,
        parentPermissionIds: permissionIds,
      });

      if (dataProtectionItems.length) {
        const elba = createElbaClient({ organisationId, region: organisation.region });
        await elba.dataProtection.updateObjects({ objects: dataProtectionItems });
      }
    });

    if (nextSkipToken) {
      await step.sendEvent('sync-next-items-page', {
        name: 'sharepoint/items.sync.triggered',
        data: {
          ...event.data,
          skipToken: nextSkipToken,
        },
      });

      return { status: 'ongoing' };
    }

    if (folderId) {
      await step.sendEvent('folders-sync-complete', {
        name: 'sharepoint/folder_items.sync.completed',
        data: { organisationId, folderId },
      });
    } else {
      // TODO: check and possibly remove promise all
      await step.sendEvent('items-sync-complete', {
        name: 'sharepoint/items.sync.completed',
        data: { organisationId, driveId },
      });

      // TODO: check this logic and understand why it's here
      // I guess it's to start to listening to webhooks events once the scan is done
      // Can't it be done at the beginning anyway, would delta conflict with state of the world sync?
      await step.sendEvent('initialize-delta', {
        name: 'sharepoint/data_protection.initialize_delta.requested',
        data: {
          organisationId,
          siteId,
          driveId,
          isFirstSync: true,
          skipToken: null,
        },
      });
    }

    return { status: 'completed' };
  }
);
