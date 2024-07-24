import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'pagerduty',
  schemas: new EventSchemas().fromRecord<{
    'pagerduty/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'pagerduty/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'pagerduty/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'pagerduty/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'pagerduty/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
