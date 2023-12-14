import { files, sharing } from 'dropbox/types/dropbox_types';

export type CommonDataFetchHeaders = {
  accessToken: string;
  isPersonal: boolean;
  teamMemberId: string;
  adminTeamMemberId: string;
};

export type SyncJobType = 'shared_link' | 'path';

export type SyncJob = {
  accessToken: string;
  organisationId: string;
  syncStartedAt: string;
  isFirstScan: boolean;
  pathRoot: number;
  level?: number;
};

export type SharedLinks = {
  url: string;
  linkAccessLevel: string;
  organisationId: string;
  teamMemberId: string;
  pathLower: string;
};

export type FolderFilePermissions = {
  id: string;
} & sharing.SharedFolderMembers;

export type DBXPermissionType = 'user' | 'group' | 'anyone' | 'domain';

export type FolderAndFilePermissions = {
  id: string | null;
  email: string | null;
  team_member_id: string | null;
  display_name: string | null;
  type: DBXPermissionType;
  role: string | null;
  domain?: string | null;
  group_id?: string | null;
  audience?: string | null;
  shared_link?: string | null;
  is_inherited?: boolean;
};

export type FormatPermissionsToAdd = {
  permissions: FolderAndFilePermissions[];
  organisationId: string;
};

export type FileAndFolderType = files.FolderMetadataReference | files.FileMetadataReference;
