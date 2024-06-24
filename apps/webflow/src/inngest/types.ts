import { type GetFunctionInput } from 'inngest';
import { type inngest } from './client';

export type InngestEvents = {
  'webflow/users.start_sync.requested': {
    data: {
      organisationId: string;
      syncStartedAt: number;
      isFirstSync: boolean;
    };
  };
  'webflow/users.sync.requested': {
    data: {
      organisationId: string;
      region: string;
      page: number;
      siteId: string;
    };
  };
  'webflow/users.sync.completed': {
    data: {
      organisationId: string;
      siteId: string;
    };
  };
  'webflow/users.delete.requested': {
    data: {
      userId: string;
      organisationId: string;
    };
  };
  'webflow/app.uninstall.requested': { data: { organisationId: string } };
};

export type InputArgWithTrigger<T extends keyof InngestEvents> = GetFunctionInput<
  typeof inngest,
  T
>;
