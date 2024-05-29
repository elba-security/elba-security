import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<{
    'intercom/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'intercom/token.refresh.requested': {
      data: {
        organisationId: string;
      };
      ts: number;
    };
    'intercom/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'intercom/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
