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
import { formatDataProtectionObjects } from '@/connectors/elba/data-protection';

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
    onFailure: async ({ event, step }) => {
      const { organisationId, driveId, folderId } = event.data.event.data;

      await step.sendEvent('items-sync-failed', {
        name: 'sharepoint/items.sync.completed',
        data: { organisationId, driveId, folderId },
      });
    },
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

      return { items: itemsPermissions, nextSkipToken: result.nextSkipToken };
    });

    const folders = items.filter(({ item }) => item.folder?.childCount);
    if (folders.length) {
      const eventsToWait = folders.map(async ({ item }) =>
        step.waitForEvent(`wait-for-folders-complete-${item.id}`, {
          event: 'sharepoint/items.sync.completed',
          timeout: '30d',
          if: `async.data.organisationId == '${organisationId}' && async.data.driveId == '${driveId}' && async.data.folderId == '${item.id}'`,
        })
      );

      await step.sendEvent(
        'sync-folders-items',
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

    await step.run('update-elba-objects', async () => {
      const { toUpdate: dataProtectionObjects } = formatDataProtectionObjects({
        items,
        siteId,
        driveId,
        parentPermissionIds: permissionIds,
      });

      if (dataProtectionObjects.length) {
        const elba = createElbaClient({ organisationId, region: organisation.region });
        await elba.dataProtection.updateObjects({ objects: dataProtectionObjects });
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

    await step.sendEvent('sync-complete', {
      name: 'sharepoint/items.sync.completed',
      data: { organisationId, folderId, driveId },
    });

    if (!folderId) {
      await step.sendEvent('initialize-delta', {
        name: 'sharepoint/delta.initialize.requested',
        data: {
          organisationId,
          siteId,
          driveId,
          isFirstSync,
        },
      });
    }

    return { status: 'completed' };
  }
);
