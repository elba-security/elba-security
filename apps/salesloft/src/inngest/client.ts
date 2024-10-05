import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'salesloft',
  schemas: new EventSchemas().fromRecord<{
    'salesloft/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'salesloft/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'salesloft/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'salesloft/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
