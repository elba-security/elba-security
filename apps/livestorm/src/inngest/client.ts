import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'livestorm',
  schemas: new EventSchemas().fromRecord<{
    'livestorm/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number | null;
      };
    };
    'livestorm/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'livestorm/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'livestorm/users.delete.requested': {
      data: {
        id: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [sentryMiddleware, unauthorizedMiddleware, rateLimitMiddleware],
  logger,
});
