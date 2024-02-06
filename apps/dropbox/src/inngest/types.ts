import type { GetFunctionInput } from 'inngest';
import { inngest } from './client';

type RefreshTokensSchema = {
  organisationId: string;
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

export type InngestEvents = {
  'dropbox/token.refresh.triggered': { data: RefreshTokensSchema };
  'dropbox/token.refresh.canceled': { data: RefreshTokensSchema };
  'dropbox/users.sync_page.triggered': { data: SyncUsersData };
  'dropbox/users.sync_page.triggered.completed': { data: SyncUsersData };
  'dropbox/third_party_apps.sync_page.triggered': { data: RunThirdPartyAppsSyncJobsSchema };
  'dropbox/third_party_apps.refresh_objects.requested': { data: RefreshThirdPartyAppsObjectSchema };
  'dropbox/third_party_apps.delete_object.requested': { data: DeleteThirdPArtyAppsObject };
};

export type InputArgWithTrigger<T extends keyof InngestEvents> = GetFunctionInput<
  typeof inngest,
  T
>;
