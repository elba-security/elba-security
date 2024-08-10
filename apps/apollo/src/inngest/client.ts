import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'apollo',
  schemas: new EventSchemas().fromRecord<{
    'apollo/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number;
      };
    };
    'apollo/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'apollo/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'apollo/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [unauthorizedMiddleware, rateLimitMiddleware],
  logger,
});
