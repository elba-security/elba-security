import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import { getItems } from '@/connectors/microsoft/sharepoint/items';
import { createElbaClient } from '@/connectors/elba/client';
import {
  formatDataProtectionItems,
  getCkunkedArray,
  getItemsWithPermissionsFromChunks,
  getParentFolderPermissions,
  groupItems,
  removeInheritedSync,
} from './common/helpers';

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
    const { siteId, driveId, isFirstSync, folder, skipToken, organisationId } = event.data;

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

    const { folders, files, nextSkipToken } = await step.run('paginate', async () => {
      const result = await getItems({
        token,
        siteId,
        driveId,
        folderId: folder?.id || null,
        skipToken,
      });

      return {
        ...groupItems(result.items),
        nextSkipToken: result.nextSkipToken,
      };
    });

    if (folders.length) {
      const eventsWait = folders.map(async ({ id }) =>
        step.waitForEvent(`wait-for-folders-complete-${id}`, {
          event: 'sharepoint/foder-items.sync.completed',
          timeout: '1d',
          if: `async.data.organisationId == '${organisationId}' && async.data.folderId == '${id}'`,
        })
      );

      await step.sendEvent(
        'items.sync.triggered',
        folders.map(({ id }) => ({
          name: 'sharepoint/items.sync.triggered',
          data: {
            siteId,
            driveId,
            isFirstSync,
            folder: {
              id,
              paginated: false,
              permissions: [],
            },
            skipToken: null,
            organisationId,
          },
        }))
      );

      await Promise.all(eventsWait);
    }

    const parentFolderPermissionsResult = await step.run(
      'get-permissions-update-elba',
      async () => {
        const itemsChunks = getCkunkedArray<MicrosoftDriveItem>(
          [...folders, ...files],
          env.MICROSOFT_DATA_PROTECTION_ITEM_PERMISSIONS_CHUNK_SIZE
        );

        const itemsWithPermissions = await getItemsWithPermissionsFromChunks({
          itemsChunks,
          token,
          siteId,
          driveId,
        });

        // Checking that we have the folder id and this is not a paginated call
        const { parentFolderPermissions, parentFolderPaginated } = await getParentFolderPermissions(
          folder,
          token,
          siteId,
          driveId
        );

        const dataProtectionItems = formatDataProtectionItems({
          itemsWithPermissions: removeInheritedSync(parentFolderPermissions, itemsWithPermissions),
          siteId,
          driveId,
        });

        if (dataProtectionItems.length) {
          const elba = createElbaClient({ organisationId, region: organisation.region });

          await elba.dataProtection.updateObjects({
            objects: dataProtectionItems,
          });
        }

        return { parentFolderPermissions, parentFolderPaginated };
      }
    );

    if (nextSkipToken) {
      await step.sendEvent('sync-next-items-page', {
        name: 'sharepoint/items.sync.triggered',
        data: {
          ...event.data,
          folder: {
            id: folder?.id || null,
            paginated: folder?.paginated || parentFolderPermissionsResult.parentFolderPaginated,
            permissions: parentFolderPermissionsResult.parentFolderPermissions,
          },

          skipToken: nextSkipToken,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    if (folder?.id) {
      await step.sendEvent('folders-sync-complete', {
        name: 'sharepoint/foder-items.sync.completed',
        data: {
          organisationId,
          folderId: folder.id,
        },
      });
    } else {
      await Promise.all([
        step.sendEvent('items-sync-complete', {
          name: 'sharepoint/items.sync.completed',
          data: {
            organisationId,
            driveId,
          },
        }),
        step.sendEvent('initialize-delta', {
          name: 'sharepoint/data_protection.initialize_delta.requested',
          data: {
            organisationId,
            siteId,
            driveId,
            isFirstSync: true,
            skipToken: null,
          },
        }),
      ]);
    }

    return {
      status: 'completed',
    };
  }
);
