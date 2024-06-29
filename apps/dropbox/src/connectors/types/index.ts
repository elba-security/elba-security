import type { DropboxAuthOptions, files, sharing, team, users } from 'dropbox';
import { DropboxResponse, DropboxResponseError } from 'dropbox';
import type { DataProtectionPermission } from '@elba-security/schemas';

export type GetAccessToken = {
  code: string;
};

export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

export type DropboxAuthResult = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  uid: string;
  team_id: string;
};

export type DropboxAuthResultWithStatus = NonNullableFields<{
  status: number;
  result: DropboxAuthResult;
}>;

export type DBXAuthOptions = {
  redirectUri: string;
} & DropboxAuthOptions;

export { DropboxResponse, DropboxResponseError };
export type { team, users };

// APPS
export type DBXAppsOption = {
  accessToken: string;
  teamMemberId?: string;
};

export type DBXFilesOptions = {
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
  organisationId: string;
  syncStartedAt: number;
  isFirstSync: boolean;
};

export type SharedLinks = {
  id: string;
  url: string;
  linkAccessLevel: string;
  pathLower: string;
};

export type DBXPermissionType = DataProtectionPermission['type'];

export type FolderAndFilePermissions = {
  id: string;
  email?: string;
  team_member_id?: string;
  display_name?: string;
  type: DataProtectionPermission['type'];
  role: sharing.AccessLevel['.tag'];
  metadata?: unknown;
};

export type FileOrFolder = files.FolderMetadataReference | files.FileMetadataReference;

export type SelectedTypes = files.FolderMetadataReference | FileSelectedTypes;

export type FileToAdd = SelectedTypes & {
  permissions: FolderAndFilePermissions[];
  metadata: {
    name: string;
    preview_url: string;
  };
};

export type ExtendedTeamMemberProfile = team.TeamMemberProfile & {
  root_folder_id: string;
};

export type FileSelectedTypes = Pick<
  files.FileMetadataReference,
  '.tag' | 'id' | 'name' | 'content_hash'
>;
