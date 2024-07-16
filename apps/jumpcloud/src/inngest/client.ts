import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'jumpcloud',
  schemas: new EventSchemas().fromRecord<{
    'jumpcloud/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number;
        role: 'admin' | 'member';
      };
    };
    'jumpcloud/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'jumpcloud/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'jumpcloud/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [unauthorizedMiddleware, rateLimitMiddleware],
  logger,
});
