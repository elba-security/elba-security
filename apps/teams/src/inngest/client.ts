import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'teams',
  schemas: new EventSchemas().fromRecord<{
    'teams/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'teams/token.refresh.triggered': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'teams/users.sync.triggered': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
