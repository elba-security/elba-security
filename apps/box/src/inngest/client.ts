import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'slack',
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
        region: string;
      };
    };
    'box/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'box/box.elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'box/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
