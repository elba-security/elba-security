import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'auth0',
  schemas: new EventSchemas().fromRecord<{
    'auth0/users.page_sync.requested': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page?: string;
      };
    };
    'auth0/app.uninstall.requested': { data: { organisationId: string } };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
