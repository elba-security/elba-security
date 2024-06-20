import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'clickup',
  schemas: new EventSchemas().fromRecord<{
    'clickup/users.sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
      };
    };
    'clickup/users.page_sync.requested': {
      data: {
        organisationId: string;
        region: string;
        teamId: string;
      };
    };
    'clickup/users.team_sync.completed': {
      data: {
        organisationId: string;
        teamId: string;
      };
    };
    'clickup/elba_app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
      };
    };
    'clickup/users.delete.requested': {
      data: {
        ids: string[];
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
