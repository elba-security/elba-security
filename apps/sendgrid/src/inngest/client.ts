import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

export const inngest = new Inngest({
  id: 'sendgrid',
  schemas: new EventSchemas().fromRecord<{
    'sendgrid/users.sync.requested': {
      data: {
        organisationId: string;
        region: string;
        nangoConnectionId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number;
      };
    };
    'sendgrid/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'sendgrid/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
    'sendgrid/users.delete.requested': {
      data: {
        organisationId: string;
        region: string;
        nangoConnectionId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, elbaConnectionErrorMiddleware],
  logger,
});
