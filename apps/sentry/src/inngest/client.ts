import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'sentry',
  schemas: new EventSchemas().fromRecord<{
    'sentry/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'sentry/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'sentry/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'sentry/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'sentry/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
