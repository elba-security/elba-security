import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'close',
  schemas: new EventSchemas().fromRecord<{
    'close/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number | null;
      };
    };
    'close/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'close/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'close/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'close/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
