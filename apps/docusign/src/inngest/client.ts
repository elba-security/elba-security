import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

export const inngest = new Inngest({
  id: 'docusign',
  schemas: new EventSchemas().fromRecord<{
    'docusign/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'docusign/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
    'docusign/users.sync.requested': {
      data: {
        organisationId: string;
        region: string;
        nangoConnectionId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        page: string | null;
      };
    };
    'docusign/users.delete.requested': {
      data: {
        organisationId: string;
        region: string;
        nangoConnectionId: string;
        userIds: string[];
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, elbaConnectionErrorMiddleware],
  logger,
});
