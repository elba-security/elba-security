import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'make',
  schemas: new EventSchemas().fromRecord<{
    'make/users.start_sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
      };
    };
    'make/users.sync.requested': {
      data: {
        organisationId: string;
        region: string;
        page: number;
        sourceOrganizationId: string;
      };
    };
    'make/users.sync.completed': {
      data: {
        organisationId: string;
        sourceOrganizationId: string;
      };
    };
    'make/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'make/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
