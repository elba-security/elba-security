import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'sumologic',
  schemas: new EventSchemas().fromRecord<{
    'sumologic/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'sumologic/sumologic.elba_app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'sumologic/sumologic.elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'sumologic/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
