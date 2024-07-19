import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: '{SaaS}',
  schemas: new EventSchemas().fromRecord<{
    '{SaaS}/users.page_sync.requested': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number | null;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
