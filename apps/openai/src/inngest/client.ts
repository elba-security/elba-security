import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'openai',
  schemas: new EventSchemas().fromRecord<{
    'openai/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
      };
    };
    'openai/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'openai/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'openai/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware],
  logger,
});
