import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'hubspot',
  schemas: new EventSchemas().fromRecord<{
    'hubspot/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'hubspot/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'hubspot/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'hubspot/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'hubspot/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
    'hubspot/timezone.refresh.requested': {
      data: {
        organisationId: string;
        region: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
