import { type GetFunctionInput } from 'inngest';
import { type inngest } from './client';

export type InngestEvents = {
  'heroku/users.sync.requested': {
    data: {
      organisationId: string;
      isFirstSync: boolean;
      syncStartedAt: number;
      cursor: string | null;
    };
  };
  'heroku/users.team-users.sync.requested': {
    data: {
      organisationId: string;
      teamId: string;
      isFirstSync: boolean;
      syncStartedAt: number;
      cursor: string | null;
    };
  };
  'heroku/token.refresh.requested': {
    data: {
      organisationId: string;
      expiresAt: number;
    };
  };
  'heroku/users.delete.requested': {
    data: {
      id: string;
      organisationId: string;
    };
  };
  'heroku/app.uninstalled': { data: { organisationId: string } };
  'heroku/app.installed': { data: { organisationId: string } };
};

export type InputArgWithTrigger<T extends keyof InngestEvents> = GetFunctionInput<
  typeof inngest,
  T
>;
