import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'statsig',
  schemas: new EventSchemas().fromRecord<{
    'statsig/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
      };
    };
    'statsig/app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'statsig/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'statsig/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
