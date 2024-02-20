import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<{
    'gitlab/users.sync.requested': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'gitlab/gitlab.elba_app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'gitlab/gitlab.token.refresh.requested': {
      data: {
        organisationId: string;
        region: string;
      };
      ts: number,
    };
    'gitlab/gitlab.elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
