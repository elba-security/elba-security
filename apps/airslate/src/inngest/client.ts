import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'airslate',
  schemas: new EventSchemas().fromRecord<{
    'airslate/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string;
      };
    };
    'airslate/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'airslate/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'airslate/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'airslate/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
