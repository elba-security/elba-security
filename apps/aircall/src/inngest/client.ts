import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<{
    'aircall/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'aircall/aircall.elba_app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'aircall/aircall.token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'aircall/aircall.elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'aircall/users.delete.requested': {
      data: {
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
