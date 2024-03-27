import type { DataProtectionObject, DataProtectionObjectPermission } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import type { MicrosoftDriveItem } from '../../../connectors/share-point/items';
import { getItems } from '../../../connectors/share-point/items';
import type { MicrosoftDriveItemPermissions } from '../../../connectors/share-point/permissions';
import { getAllItemPermissions } from '../../../connectors/share-point/permissions';

export type ItemsWithPermisions = {
  item: MicrosoftDriveItem;
  permissions: MicrosoftDriveItemPermissions[];
};

export const groupItems = (items: MicrosoftDriveItem[]) =>
  items.reduce(
    (acc, item) => {
      if (item.folder) {
        acc.folders.push(item);
      } else {
        acc.files.push(item);
      }
      return acc;
    },
    { files: [] as MicrosoftDriveItem[], folders: [] as MicrosoftDriveItem[] }
  );

export const getCkunkedArray = <T>(array: T[], batchSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    chunks.push(array.slice(i, i + Number(batchSize)));
  }
  return chunks;
};

export const formatPermissions = (
  permission: MicrosoftDriveItemPermissions
): DataProtectionObjectPermission[] | [] => {
  if (permission.grantedToV2?.user) {
    return [
      {
        id: permission.id,
        type: 'user',
        displayName: permission.grantedToV2.user.displayName,
        userId: permission.grantedToV2.user.id,
        email: permission.grantedToV2.user.email,
        metadata: {
          permissionId: permission.id,
          roles: permission.roles,
        },
      },
    ];
  } else if (permission.grantedToIdentitiesV2) {
    return permission.grantedToIdentitiesV2
      .filter(({ user }) => user) // Need to check, maybe we can remove this, because user always should be after validation in connector
      .map(({ user }) => ({
        id: `${permission.id}-SEPARATOR-${user?.id}`,
        type: 'user',
        displayName: user?.displayName,
        userId: user?.id,
        email: user?.email,
        metadata: {
          permissionId: permission.id,
          roles: permission.roles,
        },
      })) as DataProtectionObjectPermission[];
  }
  return [];
};

export const getItemsWithPermisionsFromChunks = async ({
  itemsChunks,
  token,
  siteId,
  driveId,
}: {
  itemsChunks: MicrosoftDriveItem[][];
  token: string;
  siteId: string;
  driveId: string;
}) => {
  const itemsWithPermisions: ItemsWithPermisions[] = [];

  for (const itemsChunk of itemsChunks) {
    // eslint-disable-next-line no-await-in-loop -- Avoiding hundreds of inngest functions
    const itemPermissionsChunks = await Promise.all(
      itemsChunk.map((item) =>
        getAllItemPermissions({
          token,
          siteId,
          driveId,
          itemId: item.id,
        })
      )
    );

    for (let e = 0; e < itemPermissionsChunks.length; e++) {
      const item = itemsChunk[e];
      const permissions = itemPermissionsChunks[e];

      if (!item || !permissions) continue;

      itemsWithPermisions.push({
        item,
        permissions: permissions.permissions,
      });
    }
  }

  return itemsWithPermisions;
};

export const formatDataProtetionItems = (
  itemsWithPermisions: ItemsWithPermisions[]
): DataProtectionObject[] => {
  const dataProtection: DataProtectionObject[] = [];

  for (const { item, permissions } of itemsWithPermisions) {
    if (item.createdBy.user.id) {
      const validPermissions: MicrosoftDriveItemPermissions[] = permissions.filter(
        (permission) => permission.link?.scope === 'users' || permission.grantedToV2?.user
      );

      if (validPermissions.length) {
        const dataProtectionItem = {
          id: item.id,
          name: item.name,
          ownerId: item.createdBy.user.id,
          url: item.webUrl,
          permissions: validPermissions.map(formatPermissions).flat(),
        };

        dataProtection.push(dataProtectionItem);
      }
    }
  }

  return dataProtection;
};

export const syncItems = inngest.createFunction(
  {
    id: 'one-drive-sync-items',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.MICROSOFT_DATA_PROTECTION_ITEMS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'one-drive/one-drive.elba_app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'one-drive/one-drive.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.MICROSOFT_DATA_PROTECTION_SYNC_MAX_RETRY,
  },
  { event: 'one-drive/items.sync.triggered' },
  async ({ event, step, logger }) => {
    const { siteId, driveId, isFirstSync, folderId, skipToken, organisationId } = event.data;

    logger.info('Sync Items');

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
        folderId,
        skipToken,
      });

      return {
        ...groupItems(result.items),
        nextSkipToken: result.nextSkipToken,
      };
    });

    if (folders.length) {
      const eventsWait = folders.map(async ({ id }) => {
        return step.waitForEvent(`wait-for-folders-complete-${id}`, {
          event: 'one-drive/foder-items.sync.completed',
          timeout: '1d',
          if: `async.data.organisationId == '${organisationId}' && async.data.folderId == '${id}'`,
        });
      });

      await step.sendEvent(
        'items.sync.triggered',
        folders.map(({ id }) => ({
          name: 'one-drive/items.sync.triggered',
          data: {
            siteId,
            driveId,
            isFirstSync,
            folderId: id,
            skipToken: null,
            organisationId,
          },
        }))
      );

      await Promise.all(eventsWait);
    }

    await step.run('get-permissions-update-elba', async () => {
      const itemsChunks = getCkunkedArray<MicrosoftDriveItem>(
        [...folders, ...files],
        env.MICROSOFT_DATA_PROTECTION_ITEM_PERMISSIONS_CHUNK_SIZE
      );

      const itemsWithPermisions = await getItemsWithPermisionsFromChunks({
        itemsChunks,
        token,
        siteId,
        driveId,
      });

      const dataProtectionItems = formatDataProtetionItems(
        itemsWithPermisions as unknown as ItemsWithPermisions[]
      );

      if (!dataProtectionItems.length) return;

      const elba = new Elba({
        organisationId,
        apiKey: env.ELBA_API_KEY,
        baseUrl: env.ELBA_API_BASE_URL,
        region: organisation.region,
      });

      await elba.dataProtection.updateObjects({
        objects: dataProtectionItems,
      });
    });

    if (nextSkipToken) {
      logger.info('ITEMS PAGINATION');

      await step.sendEvent('sync-next-items-page', {
        name: 'one-drive/items.sync.triggered',
        data: {
          ...event.data,
          skipToken: nextSkipToken,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    if (folderId) {
      await step.sendEvent('folders-sync-complete', {
        name: 'one-drive/foder-items.sync.completed',
        data: {
          organisationId,
          folderId,
        },
      });
    } else {
      await step.sendEvent('items-sync-complete', {
        name: 'one-drive/items.sync.completed',
        data: {
          organisationId,
          driveId,
        },
      });
    }

    return {
      status: 'completed',
    };
  }
);
