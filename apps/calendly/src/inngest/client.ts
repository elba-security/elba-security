import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'calendly', 
  schemas: new EventSchemas().fromRecord<{
    'calendly/organization.members.page_sync.requested': {
      data: {
        id: string;
        accessToken: string;
        refreshToken: string;
        region: string;
        createdAt: number;
        updatedAt: number;
      };
    };
    'calendly/calendly.elba_app.uninstalled': {
      data: {
        organizationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware], 
  logger,
});
