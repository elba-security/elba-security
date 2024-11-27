import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'front',
  schemas: new EventSchemas().fromRecord<{
    'front/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
      };
    };
    'front/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'front/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'front/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
