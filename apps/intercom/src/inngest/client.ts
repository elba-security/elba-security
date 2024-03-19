import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<{
    'intercom/users.sync.requested': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'intercom/intercom.elba_app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'intercom/intercom.token.refresh.requested': {
      data: {
        organisationId: string;
        region: string;
      };
      ts: number,
    };
    'intercom/intercom.elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
