import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'harvest',
  schemas: new EventSchemas().fromRecord<{
    'harvest/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'harvest/users.account_users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        page: string | null;
        accountId: string;
      };
    };
    'harvest/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'harvest/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'harvest/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'harvest/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
