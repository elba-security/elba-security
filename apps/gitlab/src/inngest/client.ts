import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<{
    'gitlab/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'gitlab/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'gitlab/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'gitlab/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware, sentryMiddleware],
  logger,
});
