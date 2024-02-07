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

export type InngestEvents = {
  'dropbox/token.refresh.triggered': { data: RefreshTokensSchema };
  'dropbox/token.refresh.canceled': { data: RefreshTokensSchema };
  'dropbox/users.sync_page.triggered': { data: SyncUsersData };
  'dropbox/users.sync_page.triggered.completed': { data: SyncUsersData };
};

export type InputArgWithTrigger<T extends keyof InngestEvents> = GetFunctionInput<
  typeof inngest,
  T
>;
