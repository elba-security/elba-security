import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'make',
  schemas: new EventSchemas().fromRecord<{
    'make/users.sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: number;
      };
    };
    'make/users.page_sync.requested': {
      data: {
        organisationId: string;
        region: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number;
        sourceOrganizationId: string;
      };
    };
    'make/users.organization_sync.completed': {
      data: {
        organisationId: string;
        sourceOrganizationId: string;
      };
    };
    'make/elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
