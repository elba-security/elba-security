import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

export const inngest = new Inngest({
  id: 'datadog',
  schemas: new EventSchemas().fromRecord<{
    'datadog/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: number;
        region: string;
        nangoConnectionId: string;
      };
    };
    'datadog/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'datadog/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
    'datadog/users.delete.requested': {
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
