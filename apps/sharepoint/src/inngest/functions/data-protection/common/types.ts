import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import type { SharepointPermission } from '@/connectors/microsoft/sharepoint/permissions';
import { type PermissionMetadata } from '@/connectors/elba/data-protection';

export type ItemWithPermissions = {
  item: MicrosoftDriveItem;
  permissions: SharepointPermission[];
};

export type ElbaPermissionToDelete = {
  id: string;
  metadata: PermissionMetadata;
};

export type PermissionToDelete = {
  permissionId: string;
  userEmails?: string[];
};
