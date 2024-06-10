import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import type { MicrosoftDriveItemPermissions } from '@/connectors/microsoft/sharepoint/permissions';

export type ItemsWithPermisions = {
  item: MicrosoftDriveItem;
  permissions: MicrosoftDriveItemPermissions[];
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

export type ItemsWithPermisionsParsed = {
  toDelete: string[];
  toUpdate: ItemsWithPermisions[];
};
