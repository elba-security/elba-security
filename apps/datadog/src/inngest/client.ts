import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from '@elba-security/inngest';
import { getRetryAfter } from '@/connectors/datadog/common/retry-after';
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
  middleware: [unauthorizedMiddleware, rateLimitMiddleware({ getRetryAfter })],
  logger,
});
