import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'bitbucket',
  schemas: new EventSchemas().fromRecord<{
    'bitbucket/bitbucket.elba_app.installed': {
      data: {
        organisationId: string;
      };
    };
    'bitbucket/token.refresh.requested': {
      data: {
        organisationId: string;
      };
    };
    'bitbucket/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        nextUrl: string | null;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
