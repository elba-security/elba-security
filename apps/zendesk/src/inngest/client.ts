import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'zendesk',
  schemas: new EventSchemas().fromRecord<{
    'zendesk/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'zendesk/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'zendesk/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'zendesk/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'zendesk/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
