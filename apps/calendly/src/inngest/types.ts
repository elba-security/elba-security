import { type GetFunctionInput } from 'inngest';
import { type inngest } from './client';

export type InngestEvents = {
  'calendly/users.page_sync.requested': {
    data: {
      organisationId: string;
      region: string;
      isFirstSync: boolean;
      syncStartedAt: number;
      page: number | null;
    };
  };
  'calendly/token.refresh.requested': {
    data: {
      organisationId: string;
      expiresAt: number;
    };
  };
  'calendly/calendly.elba_app.uninstalled': { data: { organisationId: string } };
};

export type InputArgWithTrigger<T extends keyof InngestEvents> = GetFunctionInput<
  typeof inngest,
  T
>;
