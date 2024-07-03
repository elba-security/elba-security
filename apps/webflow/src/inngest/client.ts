import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { sentryMiddleware } from '@elba-security/inngest';
import { rateLimitMiddleware } from '@/inngest/middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'webflow',
  schemas: new EventSchemas().fromRecord<{
    'webflow/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'webflow/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'webflow/users.start_sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
      };
    };
    'webflow/users.sync.requested': {
      data: {
        organisationId: string;
        siteId: string;
        page: number | null;
      };
    };
    'webflow/users.sync.completed': {
      data: {
        organisationId: string;
        siteId: string;
      };
    };
    'webflow/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware, sentryMiddleware],
  logger,
});
