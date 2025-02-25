import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

export const inngest = new Inngest({
  id: 'pipedrive',
  schemas: new EventSchemas().fromRecord<{
    'pipedrive/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
        region: string;
        nangoConnectionId: string;
      };
    };
    'pipedrive/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'pipedrive/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
    'pipedrive/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
        region: string;
        nangoConnectionId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, elbaConnectionErrorMiddleware],
  logger,
});
