import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'pipedrive',
  schemas: new EventSchemas().fromRecord<{
    'pipedrive/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'pipedrive/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'pipedrive/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'pipedrive/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'pipedrive/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
