import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import type { MicrosoftDriveItemPermission } from '@/connectors/microsoft/sharepoint/permissions';

export type ItemsWithPermissions = {
  item: MicrosoftDriveItem;
  permissions: MicrosoftDriveItemPermission[];
};

export type Folder = {
  id: string | null;
  paginated: boolean;
  permissions: string[] | [];
} | null;

export type ParsedDelta = {
  deleted: string[];
  updated: MicrosoftDriveItem[];
};

export type ItemsWithPermissionsParsed = {
  toDelete: string[];
  toUpdate: ItemsWithPermissions[];
};

export type CombinedPermission =
  | {
      id: string;
      type: 'user';
      email: string;
      metadata: {
        email: string;
        linksPermissionIds?: string[];
        directPermissionId?: string;
      };
    }
  | {
      id: string;
      type: 'anyone';
    };

export type CombinedLinkPermissions = {
  permissionId: string;
  userEmails?: string[];
};

export type PermissionDeletionResult = CombinedLinkPermissions & {
  siteId: string;
  driveId: string;
  itemId: string;
  status?: number;
};

export type DeleteItemFunctionParams = PermissionDeletionResult & {
  token: string;
};
