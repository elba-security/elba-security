import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'elastic',
  schemas: new EventSchemas().fromRecord<{
    'elastic/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
      };
    };
    'elastic/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'elastic/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'elastic/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [unauthorizedMiddleware, rateLimitMiddleware],
  logger,
});
