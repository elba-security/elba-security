import type { DataProtectionObject, DataProtectionObjectPermission } from '@elba-security/sdk';
import type { MicrosoftDriveItem } from '@/connectors/one-drive/share-point/items';
import {
  getAllItemPermissions,
  type MicrosoftDriveItemPermissions,
} from '@/connectors/one-drive/share-point/permissions';
import type { Delta } from '@/connectors/one-drive/delta/get-delta';
import type { Folder, ItemsWithPermisions, ItemsWithPermisionsParsed, ParsedDelta } from './types';

export const removeInheritedSync = (
  parentPermissionIds: string[],
  itemsWithPermisions: ItemsWithPermisions[]
): ItemsWithPermisions[] => {
  return itemsWithPermisions.reduce<ItemsWithPermisions[]>((acc, itemWithPermisions) => {
    const filteredPermissions = itemWithPermisions.permissions.filter(
      (permission) => !parentPermissionIds.includes(permission.id)
    );

    acc.push({
      item: itemWithPermisions.item,
      permissions: filteredPermissions,
    });

    return acc;
  }, []);
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

export const formatDataProtetionItems = ({
  itemsWithPermisions,
  siteId,
  driveId,
}: {
  itemsWithPermisions: ItemsWithPermisions[];
  siteId: string;
  driveId: string;
}): DataProtectionObject[] => {
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
          url: item.webUrl,
          ownerId: item.createdBy.user.id,
          metadata: {
            siteId,
            driveId,
          },
          updatedAt: item.lastModifiedDateTime,
          permissions: validPermissions.map(formatPermissions).flat(),
        };

        dataProtection.push(dataProtectionItem);
      }
    }
  }

  return dataProtection;
};

export const getParentFolderPermissions = async (
  folder: Folder,
  token: string,
  siteId: string,
  driveId: string
) => {
  const parentFolderPermissions: string[] = [];
  let parentFolderPaginated = false;

  if (folder?.id && !folder.paginated) {
    const { permissions } = await getAllItemPermissions({
      token,
      siteId,
      driveId,
      itemId: folder.id,
    });

    global.repeats++;

    parentFolderPaginated = true;
    parentFolderPermissions.push(...permissions.map((el) => el.id));
  } else if (folder?.permissions.length) {
    parentFolderPermissions.push(...folder.permissions);
  }

  return {
    parentFolderPermissions,
    parentFolderPaginated,
  };
};

export const parsedDeltaState = (delta: Delta[]): ParsedDelta => {
  return delta.reduce<ParsedDelta>(
    (acc, el) => {
      if (el.deleted?.state === 'deleted') acc.deleted.push(el.id);
      else acc.updated.push(el as MicrosoftDriveItem);

      return acc;
    },
    { deleted: [], updated: [] }
  );
};

export const removeInheritedUpdate = (
  itemsWithPermisions: ItemsWithPermisions[]
): ItemsWithPermisionsParsed => {
  return itemsWithPermisions.reduce<ItemsWithPermisionsParsed>(
    (acc, itemWithPermisions, _, arr) => {
      const parent = arr.find(
        ({ item: { id } }) => id === itemWithPermisions.item.parentReference.id
      );

      if (parent) {
        const parentPermissionIds = parent.permissions.map(({ id }) => id);

        const filteredPermissions = itemWithPermisions.permissions.filter(
          (permission) => !parentPermissionIds.includes(permission.id)
        );

        if (!filteredPermissions.length) {
          acc.toDelete.push(itemWithPermisions.item.id);
        } else {
          acc.toUpdate.push({
            item: itemWithPermisions.item,
            permissions: filteredPermissions,
          });
        }
      }

      return acc;
    },
    { toDelete: [], toUpdate: [] }
  );
};
