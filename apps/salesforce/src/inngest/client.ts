import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

export const inngest = new Inngest({
  id: 'salesforce',
  schemas: new EventSchemas().fromRecord<{
    'salesforce/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number;
        region: string;
        nangoConnectionId: string;
      };
    };
    'salesforce/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'salesforce/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
    'salesforce/users.delete.requested': {
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
