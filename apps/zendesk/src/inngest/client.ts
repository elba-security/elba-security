import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'zendesk',
  schemas: new EventSchemas().fromRecord<{
    'zendesk/users.sync.triggered': {
      data: {
      organisationId: string;
      isFirstSync: boolean;
      pageUrl?: string | null;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
