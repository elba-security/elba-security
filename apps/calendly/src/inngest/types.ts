import { type GetFunctionInput } from 'inngest';
import { type inngest } from './client';

export type InngestEvents = {
  'calendly/users.page_sync.requested': {
    data: {
      organisationId: string;
      region: string;
      isFirstSync: boolean;
      syncStartedAt: number;
      page: string | null;
    };
  };
  'calendly/token.refresh.requested': {
    data: {
      organisationId: string;
      expiresAt: number;
    };
  };
  'calendly/app.uninstall.requested': { data: { organisationId: string } };
};

export type InputArgWithTrigger<T extends keyof InngestEvents> = GetFunctionInput<
  typeof inngest,
  T
>;
