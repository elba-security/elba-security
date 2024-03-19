import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<{
    'pagerduty/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'pagerduty/pagerduty.elba_app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'pagerduty/pagerduty.token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'pagerduty/pagerduty.elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'pagerduty/users.delete.requested': {
      data: {
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
