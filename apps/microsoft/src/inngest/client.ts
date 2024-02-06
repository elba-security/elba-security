import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'microsoft',
  schemas: new EventSchemas().fromRecord<{
    'microsoft/users.sync_page.triggered': {
      data: {
        organisationId: string;
        tenantId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'microsoft/token.refresh.triggered': {
      data: {
        organisationId: string;
        tenantId: string;
        // required for unauthorized middleware
        region: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
