import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'fifteenfive',
  schemas: new EventSchemas().fromRecord<{
    'fifteenfive/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'fifteenfive/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'fifteenfive/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'fifteenfive/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware],
  logger,
});
