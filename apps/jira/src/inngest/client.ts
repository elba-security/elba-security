import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'jira',
  schemas: new EventSchemas().fromRecord<{
    'jira/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'jira/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'jira/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'jira/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [unauthorizedMiddleware, rateLimitMiddleware],
  logger,
});
