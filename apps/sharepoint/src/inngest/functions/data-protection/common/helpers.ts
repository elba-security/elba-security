import type { DataProtectionObject, DataProtectionObjectPermission } from '@elba-security/sdk';
import { z } from 'zod';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import {
  deleteItemPermission,
  getAllItemPermissions,
  revokeUserFromLinkPermission,
  type MicrosoftDriveItemPermission,
} from '@/connectors/microsoft/sharepoint/permissions';
import type { Delta } from '@/connectors/microsoft/delta/get-delta';
import { MicrosoftError } from '@/common/error';
import type {
  CombinedLinkPermissions,
  CombinedPermission,
  DeleteItemFunctionParams,
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

export const combinePermisisons = (
  itemId: string,
  permissions: MicrosoftDriveItemPermission[]
): DataProtectionObjectPermission[] => {
  const combinedPermissions = new Map<string, CombinedPermission>();

  permissions.forEach((permission) => {
    if (permission.grantedToV2?.user) {
      const elbaPermissionId = `item-${itemId}-user-${permission.grantedToV2.user.id}`;

      if (!combinedPermissions.has(elbaPermissionId)) {
        combinedPermissions.set(elbaPermissionId, {
          id: elbaPermissionId,
          type: 'user',
          email: permission.grantedToV2.user.email,
          metadata: {
            directPermissionId: permission.id,
            email: permission.grantedToV2.user.email,
          },
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- will be there
        const combinedItem = combinedPermissions.get(elbaPermissionId)!;
        if (combinedItem.type === 'user') {
          // It's not obvious here, but the Item can have only one direct permission,
          // so here we are only setting permission.id if combinedItem was created before (with links permissions)
          combinedItem.metadata.directPermissionId = permission.id;
        }
      }
    }

    if (permission.link?.scope === 'anonymous') {
      combinedPermissions.set(permission.id, {
        id: permission.id,
        type: 'anyone',
      });
    }

    if (permission.link?.scope === 'users' && permission.grantedToIdentitiesV2?.length) {
      permission.grantedToIdentitiesV2.forEach((identity) => {
        const elbaPermissionId = `item-${itemId}-user-${identity?.user?.id}`;
        const email = identity?.user?.email;

        if (!email) return;

        if (!combinedPermissions.has(elbaPermissionId)) {
          combinedPermissions.set(elbaPermissionId, {
            id: elbaPermissionId,
            type: 'user',
            email,
            metadata: {
              email,
              linksPermissionIds: [permission.id],
            },
          });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- will be there
          const combinedItem = combinedPermissions.get(elbaPermissionId)!;
          if (combinedItem.type === 'user') {
            combinedItem.metadata.linksPermissionIds =
              combinedItem.metadata.linksPermissionIds ?? [];
            combinedItem.metadata.linksPermissionIds.push(permission.id);
          }
        }
      });
    }
  });

  return Array.from(combinedPermissions.values());
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
          (permission.link?.scope === 'users' && permission.grantedToIdentitiesV2?.length) ||
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
          permissions: combinePermisisons(item.id, validPermissions),
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

export const createDeleteItemPermissionFunction = ({
  token,
  siteId,
  driveId,
  itemId,
  permissionId,
  userEmails,
}: DeleteItemFunctionParams) => {
  return async () => {
    try {
      if (userEmails?.length)
        await revokeUserFromLinkPermission({
          token,
          siteId,
          driveId,
          itemId,
          permissionId,
          userEmails,
        });
      else
        await deleteItemPermission({
          token,
          siteId,
          driveId,
          itemId,
          permissionId,
        });

      return {
        status: 204,
        permissionId,
        userEmails,
      };
    } catch (error) {
      if (error instanceof MicrosoftError && error.response?.status === 404) {
        return {
          status: 404,
          permissionId,
          userEmails,
        };
      }
      throw error;
    }
  };
};

export const preparePermissionDeletionArray = (permissions: CombinedPermission[]) => {
  const permissionDeletionArray: CombinedLinkPermissions[] = [];
  const combinedLinkPermissions = new Map<string, string[]>();

  for (const permission of permissions) {
    if (permission.type === 'user' && permission.metadata.directPermissionId) {
      permissionDeletionArray.push({
        permissionId: permission.metadata.directPermissionId,
      });
    }

    if (permission.type === 'anyone') {
      permissionDeletionArray.push({
        permissionId: permission.id,
      });
    }

    if (permission.type === 'user' && permission.metadata.linksPermissionIds?.length) {
      for (const permissionId of permission.metadata.linksPermissionIds) {
        if (combinedLinkPermissions.has(permissionId)) {
          combinedLinkPermissions.get(permissionId)?.push(permission.metadata.email);
        } else {
          combinedLinkPermissions.set(permissionId, [permission.metadata.email]);
        }
      }
    }
  }

  for (const [permissionId, userEmails] of combinedLinkPermissions) {
    const emailChunks = getChunkedArray<string>(userEmails, 200);
    for (const emailChunk of emailChunks) {
      permissionDeletionArray.push({
        permissionId,
        userEmails: emailChunk,
      });
    }
  }

  return permissionDeletionArray;
};
