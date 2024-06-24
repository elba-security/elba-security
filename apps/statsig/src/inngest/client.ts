import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'statsig',
  schemas: new EventSchemas().fromRecord<{
    'statsig/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number | null;
      };
    };
    'statsig/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'statsig/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware, sentryMiddleware],
  logger,
});
