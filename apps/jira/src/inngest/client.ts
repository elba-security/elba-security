import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
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
        page: number;
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
    'jira/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'jira/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware, sentryMiddleware],
  logger,
});
