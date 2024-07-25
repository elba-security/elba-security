import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'yousign',
  schemas: new EventSchemas().fromRecord<{
    'yousign/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'yousign/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'yousign/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
  }>(),
  middleware: [unauthorizedMiddleware, rateLimitMiddleware],
  logger,
});
