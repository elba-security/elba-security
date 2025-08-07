import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

export const inngest = new Inngest({
  id: 'okta',
  schemas: new EventSchemas().fromRecord<{
    'okta/users.sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
        region: string;
        nangoConnectionId: string;
        page: string | null;
      };
    };
    'okta/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'okta/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
    'okta/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
        region: string;
        nangoConnectionId: string;
      };
    };
    'okta/third_party_apps.sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: string;
        isFirstSync: boolean;
        region: string;
        nangoConnectionId: string;
      };
    };
    'okta/third_party_apps.refresh.requested': {
      data: {
        organisationId: string;
        region: string;
        nangoConnectionId: string;
        appId: string;
        userId: string;
      };
    };
    'okta/third_party_apps.delete.requested': {
      data: {
        organisationId: string;
        region: string;
        nangoConnectionId: string;
        appId: string;
        userId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, elbaConnectionErrorMiddleware],
  logger,
});
