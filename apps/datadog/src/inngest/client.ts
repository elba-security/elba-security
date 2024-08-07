import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'datadog',
  schemas: new EventSchemas().fromRecord<{
    'datadog/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number;
      };
    };
    'datadog/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'datadog/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'datadog/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [unauthorizedMiddleware, rateLimitMiddleware],
  logger,
});
