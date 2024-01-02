/* eslint-disable @typescript-eslint/no-explicit-any */
import type { files, sharing } from 'dropbox/types/dropbox_types';

export type DBXFetcherOptions = {
  accessToken: string;
  adminTeamMemberId?: string;
  teamMemberId?: string;
  pathRoot?: string;
};

export type GeneralFolderFilePermissions = {
  users: sharing.UserMembershipInfo[];
  groups: sharing.GroupMembershipInfo[];
  invitees: sharing.InviteeMembershipInfo[];
  anyone?: SharedLinks[];
};

export type FolderFilePermissions = Map<string, GeneralFolderFilePermissions>;

export type SyncJob = {
  accessToken: string;
  organisationId: string;
  syncStartedAt: string;
  isFirstScan: boolean;
  pathRoot: string;
};

export type SharedLinks = {
  url: string;
  linkAccessLevel: string;
  pathLower: string;
};

export type DBXPermissionType = 'user' | 'group' | 'anyone';

export type FolderAndFilePermissions = {
  id: string;
  email?: string;
  team_member_id?: string;
  display_name?: string;
  type: DBXPermissionType;
  role: sharing.AccessLevel['.tag'];
  metadata?: any;
};

export type FolderAndFilePermissionsToSend = {
  id: string;
  email?: string;
  displayName?: string;
  userId?: string;
  type: DBXPermissionType;
  metadata?: any;
};

export type FileAndFolderType = files.FolderMetadataReference | files.FileMetadataReference;

export type FileToAdd = FileAndFolderType & {
  permissions: FolderAndFilePermissions[];
  metadata: {
    name: string;
    preview_url: string;
  };
};
