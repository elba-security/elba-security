import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'dbtlabs',
  schemas: new EventSchemas().fromRecord<{
    'dbtlabs/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'dbtlabs/app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'dbtlabs/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'dbtlabs/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
