import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'tableau',
  schemas: new EventSchemas().fromRecord<{
    'tableau/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page?: string | null;
      };
    };
    'tableau/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'tableau/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'tableau/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
