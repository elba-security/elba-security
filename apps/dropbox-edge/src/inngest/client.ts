import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'dropbox',
  schemas: new EventSchemas().fromRecord<{
    'dropbox/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'dropbox/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'dropbox/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'dropbox/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        cursor: string | null;
      };
    };
    'dropbox/users.sync.requested.completed': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        cursor: string | null;
      };
    };
    'dropbox/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
