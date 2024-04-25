import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'zoom',
  schemas: new EventSchemas().fromRecord<{
    'zoom/users.page_sync.requested': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'zoom/zoom.token.refresh.requested': {
      data: {
        organisationId: string;
        refreshToken: string;
      };
    };
    'zoom/users.delete.requested': {
      data: {
        id: string;
        organisationId: string;
        region: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
