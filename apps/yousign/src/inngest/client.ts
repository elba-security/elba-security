import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'yousign',
  schemas: new EventSchemas().fromRecord<{
    'yousign/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'yousign/yousign.elba_app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'yousign/yousign.elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
