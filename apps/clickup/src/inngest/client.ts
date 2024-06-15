import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'clickup',
  schemas: new EventSchemas().fromRecord<{
    'clickup/users.page_sync.requested': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
      };
    };
    'clickup/elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'clickup/users.delete.requested': {
      data: {
        ids: string[];
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
