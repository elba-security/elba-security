import { type OnedrivePermission } from '@/connectors/microsoft/onedrive/permissions';
import { type MicrosoftDriveItem } from '@/connectors/microsoft/onedrive/items';
import type { PermissionToDelete, ItemWithPermissions, ElbaPermissionToDelete } from './types';

export const parseItemsInheritedPermissions = (
  items: MicrosoftDriveItem[],
  itemsPermissions: Map<string, Map<string, OnedrivePermission>>
) => {
  const toUpdate: ItemWithPermissions[] = [];
  const toDelete: string[] = [];

  for (const item of items) {
    const parentId = item.parentReference.id;
    const permissions = itemsPermissions.get(item.id) || new Map<string, OnedrivePermission>();
    const parentPermissions = parentId && itemsPermissions.get(parentId);
    const nonInheritedPermissions: OnedrivePermission[] = [];

    for (const [permissionId, permission] of permissions.entries()) {
      if (!parentPermissions || !parentPermissions.has(permissionId)) {
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
