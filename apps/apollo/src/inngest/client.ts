import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

export const inngest = new Inngest({
  id: 'apollo',
  schemas: new EventSchemas().fromRecord<{
    'apollo/users.sync.requested': {
      data: {
        organisationId: string;
        region: string;
        nangoConnectionId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number;
      };
    };
    'apollo/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'apollo/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
    'apollo/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
        region: string;
        nangoConnectionId: string;
      };
    };
  }>(),
  middleware: [elbaConnectionErrorMiddleware, rateLimitMiddleware],
  logger,
});
