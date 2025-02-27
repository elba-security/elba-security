import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

export const inngest = new Inngest({
  id: 'hubspot',
  schemas: new EventSchemas().fromRecord<{
    'hubspot/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
        region: string;
        nangoConnectionId: string;
      };
    };
    'hubspot/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'hubspot/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
    'hubspot/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
        nangoConnectionId: string;
        region: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, elbaConnectionErrorMiddleware],
  logger,
});
