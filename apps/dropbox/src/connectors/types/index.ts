import {
  DropboxAuthOptions,
  DropboxResponse,
  DropboxResponseError,
  files,
  sharing,
  team,
  users,
} from 'dropbox';
import { DataProtectionPermission } from '@elba-security/schemas';

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

export interface DBXAuthOptions extends DropboxAuthOptions {
  redirectUri: string;
}

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
  metadata?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export type FileOrFolder = files.FolderMetadataReference | files.FileMetadataReference;

export type FileToAdd = FileOrFolder & {
  permissions: FolderAndFilePermissions[];
  metadata: {
    name: string;
    preview_url: string;
  };
};

export type DeleteObjectPermissions = {
  id: string;
  organisationId: string;
  metadata: {
    ownerId: string;
    type: 'file' | 'folder';
    isPersonal: boolean;
  };
  permissions: Array<{
    id: string;
    metadata: {
      sharedLinks: string[];
    };
  }>;
};

export type ExtendedTeamMemberProfile = team.TeamMemberProfile & {
  root_folder_id: string;
};
