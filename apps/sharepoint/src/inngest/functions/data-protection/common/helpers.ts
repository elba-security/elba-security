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
  ItemWithPermissions,
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

// TODO: check if we need this
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
  const itemsWithPermissions: ItemWithPermissions[] = [];

  for (const itemsChunk of itemsChunks) {
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
        permissions: permissions,
      });
    }
  }

  return itemsWithPermissions;
};

export const formatDataProtectionObjects = ({
  items,
  siteId,
  driveId,
  parentPermissionIds,
}: {
  items: ItemWithPermissions[];
  siteId: string;
  driveId: string;
  parentPermissionIds: string[];
}): DataProtectionObject[] => {
  const objects: DataProtectionObject[] = [];
  const parentPermissions = new Set(parentPermissionIds);

  for (const { item, permissions } of items) {
    // TODO: is item creator always the owner? - Check with a deleted user
    if (item.createdBy.user.id) {
      const ownPermissions = permissions.filter(({ id }) => !parentPermissions.has(id));
      const formattedPermissions = formatPermissions(ownPermissions);
      if (formattedPermissions.length) {
        const object = {
          id: item.id,
          name: item.name,
          url: item.webUrl,
          ownerId: item.createdBy.user.id,
          metadata: {
            siteId,
            driveId,
          } satisfies ItemMetadata,
          updatedAt: item.lastModifiedDateTime,
          permissions: formattedPermissions,
        };

        objects.push(object);
      }
    }
  }

  return objects;
};

export const parsedDeltaState = (deltaItems: Delta[]): ParsedDelta => {
  // TODO: fix variable names & types
  const items: ParsedDelta = { deleted: [], updated: [] };
  for (const item of deltaItems) {
    if (item.deleted?.state === 'deleted') {
      items.deleted.push(item.id);
    } else {
      items.updated.push(item as MicrosoftDriveItem); // TODO: fix this
    }
  }
  return items;
};

// TODO: rename this function
export const removeInheritedUpdate = (items: ItemWithPermissions[]): ItemsWithPermissionsParsed => {
  const toUpdate: ItemWithPermissions[] = [];
  const toDelete: string[] = [];
  const itemsPermissions = new Map(
    items.map(({ item: { id: itemId }, permissions }) => [
      itemId,
      new Set(permissions.map(({ id: permissionId }) => permissionId)),
    ])
  );

  for (const { item, permissions } of items) {
    const parent = itemsPermissions.get(item.id);
    if (!parent) {
      continue;
    }

    const nonInheritedPermissions: MicrosoftDriveItemPermission[] = [];
    for (const permission of permissions) {
      if (!parent.has(permission.id)) {
        nonInheritedPermissions.push(permission);
      }
    }

    if (nonInheritedPermissions.length) {
      toUpdate.push({ item, permissions });
    } else {
      toDelete.push(item.id);
    }
  }

  return { toUpdate, toDelete };
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

export const preparePermissionDeletionArray = (
  permissions: SharepointDeletePermission[]
): CombinedLinkPermissions[] => {
  // TODO: rename variables
  const permissionDeletionArray: CombinedLinkPermissions[] = [];
  const combinedLinkPermissions = new Map<string, string[]>();

  for (const { metadata } of permissions) {
    if (metadata.type === 'user') {
      if (metadata.directPermissionId) {
        permissionDeletionArray.push({ permissionId: metadata.directPermissionId });
      }

      if (metadata.linksPermissionIds.length) {
        for (const permissionId of metadata.linksPermissionIds) {
          let linkPermission = combinedLinkPermissions.get(permissionId);

          if (!linkPermission) {
            linkPermission = [];
            combinedLinkPermissions.set(permissionId, linkPermission);
          }

          linkPermission.push(metadata.email);
        }
      }
    }

    if (metadata.type === 'anyone') {
      permissionDeletionArray.push(
        ...metadata.permissionIds.map((permissionId) => ({ permissionId }))
      );
    }
  }

  return [
    ...permissionDeletionArray,
    ...[...combinedLinkPermissions.entries()].map(([permissionId, userEmails]) => ({
      permissionId,
      userEmails,
    })),
  ];
};
