import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'gusto',
  schemas: new EventSchemas().fromRecord<{
    'gusto/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number;
      };
    };
    'gusto/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'gusto/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'gusto/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'gusto/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
