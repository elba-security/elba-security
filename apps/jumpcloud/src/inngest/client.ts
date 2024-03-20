import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'jumpcloud',
  schemas: new EventSchemas().fromRecord<{
    'jumpcloud/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'jumpcloud/jumpcloud.elba_app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'jumpcloud/jumpcloud.elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'jumpcloud/users.delete.requested': {
      data: {
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
