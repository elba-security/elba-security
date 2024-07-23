import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import {
  getAllItemPermissions,
  type SharepointPermission,
} from '@/connectors/microsoft/sharepoint/permissions';
import type {
  CombinedLinkPermissions,
  ItemWithPermissions,
  ItemsWithPermissionsParsed,
  SharepointDeletePermission,
} from './types';

export const getChunkedArray = <T>(array: T[], batchSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    chunks.push(array.slice(i, i + Number(batchSize)));
  }
  return chunks;
};

export const parseItemsInheritedPermissions = (
  items: ItemWithPermissions[]
): ItemsWithPermissionsParsed => {
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
    const nonInheritedPermissions: SharepointPermission[] = [];

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

export const parsePermissionsToDelete = (
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
