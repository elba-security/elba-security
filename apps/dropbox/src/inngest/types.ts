import type { GetFunctionInput } from 'inngest';
import { inngest } from './client';

type AppSchema = {
  organisationId: string;
};

type RefreshTokensSchema = {
  organisationId: string;
  expiresAt: number;
};

type SyncUsersData = {
  organisationId: string;
  isFirstSync: boolean;
  cursor?: string;
  syncStartedAt: number;
};

type RunThirdPartyAppsSyncJobsSchema = {
  organisationId: string;
  isFirstSync: boolean;
  syncStartedAt: number;
  cursor?: string;
};

type RefreshThirdPartyAppsObjectSchema = {
  organisationId: string;
  userId: string;
  appId: string;
};

type DeleteThirdPArtyAppsObject = {
  organisationId: string;
  userId: string;
  appId: string;
};

type CreateSyncSharedLinksSchema = {
  organisationId: string;
  isFirstSync: boolean;
  syncStartedAt: number;
  cursor?: string;
};

export type SynchronizeSharedLinksSchema = {
  organisationId: string;
  teamMemberId: string;
  syncStartedAt: number;
  isFirstSync: boolean;
  cursor?: string;
  pathRoot?: string;
  isPersonal: boolean;
};

type CreateFolderAndFilesSyncJobsSchema = {
  organisationId: string;
  syncStartedAt: number;
  isFirstSync: boolean;
  cursor?: string;
};

type SyncFilesAndFoldersSchema = {
  organisationId: string;
  syncStartedAt: number;
  isFirstSync: boolean;
  teamMemberId: string;
  cursor?: string;
};

export type DeleteObjectPermissionsSchema = {
  id: string;
  organisationId: string;
  metadata: {
    ownerId: string;
    type: 'file' | 'folder';
    isPersonal: boolean;
  };
  permission: {
    id: string;
    metadata: {
      sharedLinks?: string[];
    };
  };
};

export type RefreshDataProtectionObjectSchema = {
  id: string;
  organisationId: string;
  metadata: {
    ownerId: string;
    type: 'file' | 'folder';
    isPersonal: boolean;
  };
};

export type InngestEvents = {
  'dropbox/app.install.requested': { data: AppSchema };
  'dropbox/app.uninstall.requested': { data: AppSchema };
  'dropbox/token.refresh.triggered': { data: RefreshTokensSchema };
  'dropbox/token.refresh.canceled': { data: RefreshTokensSchema };
  'dropbox/users.sync_page.triggered': { data: SyncUsersData };
  'dropbox/users.sync_page.triggered.completed': { data: SyncUsersData };
  'dropbox/third_party_apps.sync_page.triggered': { data: RunThirdPartyAppsSyncJobsSchema };
  'dropbox/third_party_apps.refresh_objects.requested': { data: RefreshThirdPartyAppsObjectSchema };
  'dropbox/third_party_apps.delete_object.requested': { data: DeleteThirdPArtyAppsObject };
  'dropbox/data_protection.shared_link.start.sync_page.requested': {
    data: CreateSyncSharedLinksSchema;
  };
  'dropbox/data_protection.shared_links.sync_page.requested': {
    data: SynchronizeSharedLinksSchema;
  };
  'dropbox/data_protection.synchronize_shared_links.sync_page.completed': {
    data: SynchronizeSharedLinksSchema;
  };
  'dropbox/data_protection.folder_and_files.start.sync_page.requested': {
    data: CreateFolderAndFilesSyncJobsSchema;
  };
  'dropbox/data_protection.folder_and_files.sync_page.requested': {
    data: SyncFilesAndFoldersSchema;
  };
  'dropbox/data_protection.delete_object_permission.requested': {
    data: DeleteObjectPermissionsSchema;
  };
  'dropbox/data_protection.refresh_object.requested': { data: RefreshDataProtectionObjectSchema };
};

export type InputArgWithTrigger<T extends keyof InngestEvents> = GetFunctionInput<
  typeof inngest,
  T
>;
