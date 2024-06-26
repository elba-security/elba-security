import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'clickup',
  schemas: new EventSchemas().fromRecord<{
    'clickup/users.start_sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
      };
    };
    'clickup/users.sync.requested': {
      data: {
        organisationId: string;
        teamId: string;
      };
    };
    'clickup/users.sync.completed': {
      data: {
        organisationId: string;
        teamId: string;
      };
    };
    'clickup/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'clickup/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'clickup/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
