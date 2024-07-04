import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'linear',
  schemas: new EventSchemas().fromRecord<{
    'linear/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'linear/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'linear/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'linear/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware],
  logger,
});
