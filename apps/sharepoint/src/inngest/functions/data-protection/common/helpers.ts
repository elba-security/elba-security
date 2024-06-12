import type { DataProtectionObject, DataProtectionObjectPermission } from '@elba-security/sdk';
import { z } from 'zod';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import {
  getAllItemPermissions,
  type MicrosoftDriveItemPermission,
} from '@/connectors/microsoft/sharepoint/permissions';
import type { Delta } from '@/connectors/microsoft/delta/get-delta';
import type {
  Folder,
  ItemsWithPermissions,
  ItemsWithPermissionsParsed,
  ParsedDelta,
} from './types';

export const itemMetadataSchema = z.object({
  siteId: z.string(),
  driveId: z.string(),
});

type ItemMetadata = z.infer<typeof itemMetadataSchema>;

export const removeInheritedSync = (
  parentPermissionIds: string[],
  itemsWithPermissions: ItemsWithPermissions[]
): ItemsWithPermissions[] => {
  return itemsWithPermissions.map(({ item, permissions }) => {
    const filteredPermissions = permissions.filter(
      (permission) => !parentPermissionIds.includes(permission.id)
    );
    return {
      item,
      permissions: filteredPermissions,
    };
  });
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

export const getChunkedArray = <T>(array: T[], batchSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    chunks.push(array.slice(i, i + Number(batchSize)));
  }
  return chunks;
};

export const formatPermissions = (
  permission: MicrosoftDriveItemPermission
): DataProtectionObjectPermission | null => {
  if (permission.grantedToV2?.user) {
    return {
      id: permission.id,
      type: 'user',
      displayName: permission.grantedToV2.user.displayName,
      userId: permission.grantedToV2.user.id,
      email: permission.grantedToV2.user.email,
    };
  } else if (permission.link?.scope === 'anonymous') {
    return {
      id: permission.id,
      type: 'anyone',
      metadata: {
        sharedLinks: [permission.link.webUrl],
      },
    };
  }

  // TODO: This part is for link access when we create a link for people that we choose, will be updated in next iterations
  // else if (permission.link?.scope === 'users') {
  //   return permission.grantedToIdentitiesV2
  //     .filter(({ user }) => user) // Need to check, maybe we can remove this, because user always should be after validation in connector
  //     .map(({ user }) => ({
  //       id: `${permission.id}-SEPARATOR-${user?.id}`,
  //       type: 'user',
  //       displayName: user?.displayName,
  //       userId: user?.id,
  //     })) as DataProtectionObjectPermission[];
  // }
  return null;
};

export const getItemsWithPermissionsFromChunks = async ({
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
  const itemsWithPermissions: ItemsWithPermissions[] = [];

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

      itemsWithPermissions.push({
        item,
        permissions: permissions.permissions,
      });
    }
  }

  return itemsWithPermissions;
};

export const formatDataProtectionItems = ({
  itemsWithPermissions,
  siteId,
  driveId,
}: {
  itemsWithPermissions: ItemsWithPermissions[];
  siteId: string;
  driveId: string;
}): DataProtectionObject[] => {
  const dataProtection: DataProtectionObject[] = [];

  for (const { item, permissions } of itemsWithPermissions) {
    if (item.createdBy.user.id) {
      const validPermissions: MicrosoftDriveItemPermission[] = permissions.filter(
        (permission) =>
          permission.link?.scope === 'users' ||
          permission.link?.scope === 'anonymous' ||
          permission.grantedToV2?.user
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
          } satisfies ItemMetadata,
          updatedAt: item.lastModifiedDateTime,
          permissions: validPermissions
            .map(formatPermissions)
            .filter((permission): permission is DataProtectionObjectPermission =>
              Boolean(permission)
            ),
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
  if (folder?.id && !folder.paginated) {
    const { permissions } = await getAllItemPermissions({
      token,
      siteId,
      driveId,
      itemId: folder.id,
    });
    return {
      parentFolderPaginated: true,
      parentFolderPermissions: permissions.map(({ id }) => id),
    };
  }

  return {
    parentFolderPaginated: false,
    parentFolderPermissions: folder?.permissions ?? [],
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
  itemsWithPermissions: ItemsWithPermissions[]
): ItemsWithPermissionsParsed => {
  return itemsWithPermissions.reduce<ItemsWithPermissionsParsed>(
    (acc, itemWithPermissions, _, arr) => {
      const parent = arr.find(
        ({ item: { id } }) => id === itemWithPermissions.item.parentReference.id
      );

      if (parent) {
        const parentPermissionIds = parent.permissions.map(({ id }) => id);

        const filteredPermissions = itemWithPermissions.permissions.filter(
          (permission) => !parentPermissionIds.includes(permission.id)
        );

        if (!filteredPermissions.length) {
          acc.toDelete.push(itemWithPermissions.item.id);
        } else {
          acc.toUpdate.push({
            item: itemWithPermissions.item,
            permissions: filteredPermissions,
          });
        }
      }

      return acc;
    },
    { toDelete: [], toUpdate: [] }
  );
};
