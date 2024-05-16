import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'aircall',
  schemas: new EventSchemas().fromRecord<{
    'aircall/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'aircall/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'aircall/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'aircall/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'aircall/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware, sentryMiddleware],
  logger,
});
