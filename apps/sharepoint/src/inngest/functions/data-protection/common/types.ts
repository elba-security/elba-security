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
