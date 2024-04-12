import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'fivetran',
  schemas: new EventSchemas().fromRecord<{
    'fivetran/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'fivetran/app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'fivetran/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'fivetran/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
