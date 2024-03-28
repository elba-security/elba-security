import { type GetFunctionInput } from 'inngest';
import { type inngest } from './client';

export type InngestEvents = {
  'harvest/users.page_sync.requested': {
    data: {
      organisationId: string;
      region: string;
      isFirstSync: boolean;
      syncStartedAt: number;
      page: number | null;
    };
  };
  'harvest/token.refresh.requested': {
    data: {
      organisationId: string;
      expiresAt: number;
    };
  };
  'harvest/users.delete.requested': {
    data: {
      id: string;
      organisationId: string;
    };
  };
  'harvest/app.uninstall.requested': { data: { organisationId: string } };
};

export type InputArgWithTrigger<T extends keyof InngestEvents> = GetFunctionInput<
  typeof inngest,
  T
>;
