import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'box',
  schemas: new EventSchemas().fromRecord<{
    'box/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'box/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'box/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'box/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'box/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
