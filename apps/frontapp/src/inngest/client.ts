import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'frontapp',
  schemas: new EventSchemas().fromRecord<{
    'frontapp/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'frontapp/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'frontapp/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'frontapp/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'frontapp/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
