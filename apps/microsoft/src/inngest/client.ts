import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { unauthorizedMiddleware } from './middlewares/unauthorized-middleware';

export const inngest = new Inngest({
  id: 'microsoft',
  schemas: new EventSchemas().fromRecord<{
    'microsoft/third_party_apps.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'microsoft/third_party_apps.revoke_app_permission.requested': {
      data: {
        organisationId: string;
        appId: string;
        permissionId: string;
      };
    };
    'microsoft/third_party_apps.refresh_app_permission.requested': {
      data: {
        organisationId: string;
        appId: string;
        userId: string;
      };
    };
    'microsoft/users.sync.triggered': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'microsoft/microsoft.elba_app.installed': {
      data: {
        organisationId: string;
      };
    };
    'microsoft/microsoft.elba_app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'microsoft/token.refresh.triggered': {
      data: {
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, unauthorizedMiddleware, sentryMiddleware],
  logger,
});
