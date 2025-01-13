import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

export const inngest = new Inngest({
  id: 'notion',
  schemas: new EventSchemas().fromRecord<{
    'notion/users.sync.requested': {
      data: {
        organisationId: string;
        region: string;
        nangoConnectionId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'notion/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'notion/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, elbaConnectionErrorMiddleware],
  logger,
});
