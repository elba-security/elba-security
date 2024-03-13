import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<{
    'pipedrive/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'pipedrive/pipedrive.elba_app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'pipedrive/pipedrive.token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'pipedrive/pipedrive.elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
