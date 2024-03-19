import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'x-saas',
  schemas: new EventSchemas().fromRecord<{
    'x-saas/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number | null;
      };
    };
    'x-saas/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'x-saas/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'x-saas/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
