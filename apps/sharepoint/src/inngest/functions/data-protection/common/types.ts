import type { DataProtectionObjectPermission } from '@elba-security/sdk';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import type { MicrosoftDriveItemPermission } from '@/connectors/microsoft/sharepoint/permissions';
import type {
  UserPermissionMetadata,
  AnyonePermissionMetadata,
  SharepointMetadata,
} from './helpers';

export type ItemWithPermissions = {
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
  toUpdate: ItemWithPermissions[];
};

type ExtractPermissionType<T, U> = T extends { type: U } ? T : never;

export type SharepointDataProtectionPermission =
  | (ExtractPermissionType<DataProtectionObjectPermission, 'anyone'> & {
      metadata: AnyonePermissionMetadata;
    })
  | (ExtractPermissionType<DataProtectionObjectPermission, 'user'> & {
      metadata: UserPermissionMetadata;
    });

export type SharepointDeletePermission = {
  id: string;
  metadata: SharepointMetadata;
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
