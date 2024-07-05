import { type SharepointPermission } from '@/connectors/microsoft/sharepoint/permissions';
import type { PermissionToDelete, ItemWithPermissions, ElbaPermissionToDelete } from './types';

export const getChunkedArray = <T>(array: T[], batchSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    chunks.push(array.slice(i, i + Number(batchSize)));
  }
  return chunks;
};

export const parseItemsInheritedPermissions = (items: ItemWithPermissions[]) => {
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
  permissions: ElbaPermissionToDelete[]
): PermissionToDelete[] => {
  const permissionIds: string[] = [];
  const userLinkPermissionIds = new Map<string, string[]>();

  for (const { metadata } of permissions) {
    if (metadata.type === 'user') {
      if (metadata.directPermissionId) {
        permissionIds.push(metadata.directPermissionId);
      }

      if (metadata.linksPermissionIds.length) {
        for (const permissionId of metadata.linksPermissionIds) {
          let linkPermission = userLinkPermissionIds.get(permissionId);

          if (!linkPermission) {
            linkPermission = [];
            userLinkPermissionIds.set(permissionId, linkPermission);
          }

          linkPermission.push(metadata.email);
        }
      }
    }

    if (metadata.type === 'anyone') {
      permissionIds.push(...metadata.permissionIds);
    }
  }

  return [
    ...permissionIds.map((permissionId) => ({ permissionId })),
    ...[...userLinkPermissionIds.entries()].map(([permissionId, userEmails]) => ({
      permissionId,
      userEmails,
    })),
  ];
};
