import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'monday',
  schemas: new EventSchemas().fromRecord<{
    'monday/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number | null;
      };
    };
    'monday/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'monday/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'monday/users.delete.requested': {
      data: {
        organisationId: string;
        userIds: string[];
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware, sentryMiddleware],
  logger,
});
