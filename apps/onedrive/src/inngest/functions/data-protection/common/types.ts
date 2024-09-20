import type { MicrosoftDriveItem } from '@/connectors/microsoft/onedrive/items';
import type { OnedrivePermission } from '@/connectors/microsoft/onedrive/permissions';
import { type PermissionMetadata } from '@/connectors/elba/data-protection';

export type ItemWithPermissions = {
  item: MicrosoftDriveItem;
  permissions: OnedrivePermission[];
};

export type ElbaPermissionToDelete = {
  id: string;
  metadata: PermissionMetadata;
};

export type PermissionToDelete = {
  permissionId: string;
  userEmails?: string[];
};
