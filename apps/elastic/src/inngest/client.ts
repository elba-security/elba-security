import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'elastic',
  schemas: new EventSchemas().fromRecord<{
    'elastic/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'elastic/app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'elastic/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'elastic/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
