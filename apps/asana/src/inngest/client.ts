import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'asana',
  schemas: new EventSchemas().fromRecord<{
    'asana/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'asana/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'asana/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'asana/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'asana/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware, sentryMiddleware],
  logger,
});
