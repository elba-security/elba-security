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
  DeleteItemFunctionParams,
  Folder,
  ItemsWithPermissions,
  ItemsWithPermissionsParsed,
  ParsedDelta,
  SharepointDeletePermission,
} from './types';

export const itemMetadataSchema = z.object({
  siteId: z.string(),
  driveId: z.string(),
});

type ItemMetadata = z.infer<typeof itemMetadataSchema>;

export const userPermissionMetadataSchema = z.object({
  type: z.literal('user'),
  email: z.string(),
  linksPermissionIds: z.array(z.string()),
  directPermissionId: z.string().optional(),
});

export type UserPermissionMetadata = z.infer<typeof userPermissionMetadataSchema>;

export const anyonePermissionMetadataSchema = z.object({
  type: z.literal('anyone'),
  permissionIds: z.array(z.string()),
});

export type AnyonePermissionMetadata = z.infer<typeof anyonePermissionMetadataSchema>;

export const sharepointMetadata = z.union([
  userPermissionMetadataSchema,
  anyonePermissionMetadataSchema,
]);

export type SharepointMetadata = z.infer<typeof sharepointMetadata>;

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

export const formatPermissions = (permissions: MicrosoftDriveItemPermission[]) => {
  const usersPermissions = new Map<string, UserPermissionMetadata>();
  const anyonePermissionIds = new Set<string>();

  for (const permission of permissions) {
    if (permission.link?.scope === 'anonymous') {
      anyonePermissionIds.add(permission.id);
    }

    if (permission.grantedToV2?.user) {
      const userId = permission.grantedToV2.user.id;

      let userPermissions = usersPermissions.get(userId);
      if (!userPermissions) {
        userPermissions = {
          type: 'user',
          email: permission.grantedToV2.user.email,
          linksPermissionIds: [],
        };
        usersPermissions.set(userId, userPermissions);
      }
      userPermissions.directPermissionId = permission.id;
    }

    if (permission.link?.scope === 'users' && permission.grantedToIdentitiesV2?.length) {
      for (const identity of permission.grantedToIdentitiesV2) {
        if (!identity?.user?.email || identity.user.id) {
          continue;
        }
        const userId = identity.user.id;

        let userPermissions = usersPermissions.get(userId);
        if (!userPermissions) {
          userPermissions = {
            type: 'user',
            email: identity.user.email,
            linksPermissionIds: [],
          };
          usersPermissions.set(userId, userPermissions);
        }
        userPermissions.linksPermissionIds.push(permission.id);
      }
    }
  }

  const elbaPermissions: DataProtectionObjectPermission[] = [];
  if (anyonePermissionIds.size) {
    elbaPermissions.push({
      id: 'anyone',
      type: 'anyone',
      metadata: {
        type: 'anyone',
        permissionIds: [...anyonePermissionIds],
      } satisfies AnyonePermissionMetadata,
    });
  }

  if (usersPermissions.size) {
    for (const [userId, metadata] of usersPermissions.entries()) {
      elbaPermissions.push({
        id: `user-${userId}`,
        type: 'user',
        email: metadata.email,
        userId,
        metadata,
      });
    }
  }

  return elbaPermissions;
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
          permissions: formatPermissions(validPermissions),
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

export const preparePermissionDeletionArray = (permissions: SharepointDeletePermission[]) => {
  const permissionDeletionArray: CombinedLinkPermissions[] = [];
  const combinedLinkPermissions = new Map<string, string[]>();

  for (const permission of permissions) {
    if (permission.metadata.type === 'user' && permission.metadata.directPermissionId) {
      permissionDeletionArray.push({
        permissionId: permission.metadata.directPermissionId,
      });
    }

    if (permission.metadata.type === 'anyone') {
      permissionDeletionArray.push({
        permissionId: permission.id,
      });
    }

    if (permission.metadata.type === 'user' && permission.metadata.linksPermissionIds.length) {
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
