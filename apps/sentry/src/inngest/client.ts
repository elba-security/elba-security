import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'sentry',
  schemas: new EventSchemas().fromRecord<{
    'sentry/users.page_sync.requested': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        cursor: string | null;
      };
    };
    'sentry/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'sentry/users.delete.requested': {
      data: {
        id: string;
        organisationId: string;
        region: string;
      };
    };
  }>(),
  middleware: [sentryMiddleware, rateLimitMiddleware],
  logger,
});
