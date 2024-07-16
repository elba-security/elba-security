import type { DataProtectionObject, DataProtectionObjectPermission } from '@elba-security/sdk';
import { z } from 'zod';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import {
  getAllItemPermissions,
  type MicrosoftDriveItemPermission,
} from '@/connectors/microsoft/sharepoint/permissions';
import type {
  CombinedLinkPermissions,
  ItemWithPermissions,
  ItemsWithPermissionsParsed,
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

export const getChunkedArray = <T>(array: T[], batchSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    chunks.push(array.slice(i, i + Number(batchSize)));
  }
  return chunks;
};

export const formatPermissions = (permissions: MicrosoftDriveItemPermission[]) => {
  const usersPermissions = new Map<string, UserPermissionMetadata & { userId?: string }>();
  const anyonePermissionIds = new Set<string>();

  for (const permission of permissions) {
    if (permission.link?.scope === 'anonymous') {
      anyonePermissionIds.add(permission.id);
    }

    if (permission.grantedToV2?.user) {
      const userEmail = permission.grantedToV2.user.email;

      let userPermissions = usersPermissions.get(userEmail);
      if (!userPermissions) {
        userPermissions = {
          type: 'user',
          userId: permission.grantedToV2.user.id,
          email: permission.grantedToV2.user.email,
          linksPermissionIds: [],
        };
        usersPermissions.set(userEmail, userPermissions);
      }
      userPermissions.directPermissionId = permission.id;
    }

    if (permission.link?.scope === 'users' && permission.grantedToIdentitiesV2?.length) {
      for (const identity of permission.grantedToIdentitiesV2) {
        if (!identity?.user) {
          continue;
        }
        const userEmail = identity.user.email;

        let userPermissions = usersPermissions.get(userEmail);
        if (!userPermissions) {
          userPermissions = {
            type: 'user',
            userId: identity.user.id,
            email: identity.user.email,
            linksPermissionIds: [],
          };
          usersPermissions.set(userEmail, userPermissions);
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
    for (const [userEmail, { userId, ...metadata }] of usersPermissions.entries()) {
      elbaPermissions.push({
        id: `user-${userId || userEmail}`,
        type: 'user',
        email: userEmail,
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
        permissions,
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
    const parentId = item.parentReference.id;
    const parentPermissions = parentId && itemsPermissions.get(parentId);
    // if (!parentPermissions) {
    //   // TODO: change this logic
    //   console.error(JSON.stringify({ parentId, parentPermissions, item }, null, 2));
    //   continue;
    // }

    // TODO: ignore root folder?

    const nonInheritedPermissions: MicrosoftDriveItemPermission[] = [];
    for (const permission of permissions) {
      if (!parentPermissions || !parentPermissions.has(permission.id)) {
        nonInheritedPermissions.push(permission);
      } else {
        console.warn({ inheritedPermission: permission });
      }
    }

    if (nonInheritedPermissions.length) {
      toUpdate.push({ item, permissions: nonInheritedPermissions });
    } else {
      toDelete.push(item.id);
    }
  }

  return { toUpdate, toDelete };
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
