import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'azuredevops',
  schemas: new EventSchemas().fromRecord<{
    'azuredevops/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'azuredevops/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'azuredevops/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'azuredevops/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'azuredevops/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
