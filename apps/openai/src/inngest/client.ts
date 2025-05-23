import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

export const inngest = new Inngest({
  id: 'openai',
  schemas: new EventSchemas().fromRecord<{
    'openai/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        region: string;
        nangoConnectionId: string;
        page: string | null;
      };
    };
    'openai/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
    'openai/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'openai/users.delete.requested': {
      data: {
        userId: string;
        organisationId: string;
        region: string;
        nangoConnectionId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, elbaConnectionErrorMiddleware],
  logger,
});
