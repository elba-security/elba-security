import type { GetFunctionInput } from 'inngest';
import { inngest } from './client';

type RunRefreshTokensSchema = {
  organisationId: string;
};

type RunUserSyncJobsSchema = {
  organisationId: string;
  isFirstSync: boolean;
  cursor?: string;
  syncStartedAt: string;
};

export type InngestEvents = {
  'dropbox/token.refresh.triggered': { data: RunRefreshTokensSchema };
  'dropbox/token.refresh.canceled': { data: RunRefreshTokensSchema };
  'dropbox/users.sync_page.triggered': { data: RunUserSyncJobsSchema };
  'dropbox/users.sync_page.triggered.completed': { data: RunUserSyncJobsSchema };
};

export type InputArgWithTrigger<T extends keyof InngestEvents> = GetFunctionInput<
  typeof inngest,
  T
>;
