import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'bitbucket',
  schemas: new EventSchemas().fromRecord<{
    'bitbucket/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'bitbucket/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'bitbucket/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'bitbucket/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
