import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from '@elba-security/inngest';
import { getRetryAfter } from '@/connectors/calendly/common/retry-after';

export const inngest = new Inngest({
  id: 'calendly',
  schemas: new EventSchemas().fromRecord<{
    'calendly/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'calendly/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'calendly/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'calendly/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'calendly/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware({ getRetryAfter })],
  logger,
});
