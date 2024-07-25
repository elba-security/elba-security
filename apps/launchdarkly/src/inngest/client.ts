import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'launchdarkly',
  schemas: new EventSchemas().fromRecord<{
    'launchdarkly/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'launchdarkly/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'launchdarkly/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'launchdarkly/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware],
  logger,
});
