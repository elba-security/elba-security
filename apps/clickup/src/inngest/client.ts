import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
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
      };
    };
    'clickup/users.delete.requested': {
      data: {
        id: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [sentryMiddleware, rateLimitMiddleware],
  logger,
});
