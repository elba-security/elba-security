import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'gitlab',
  schemas: new EventSchemas().fromRecord<{
    'gitlab/users.page_sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'gitlab/app.installed': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'gitlab/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'gitlab/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
