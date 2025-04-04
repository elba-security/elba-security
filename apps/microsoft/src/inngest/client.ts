import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'microsoft',
  schemas: new EventSchemas().fromRecord<{
    'microsoft/debug.inspect_token.requested': {
      data: {
        organisationId: string;
      };
    };
    'microsoft/third_party_apps.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'microsoft/third_party_apps.get_app_oauth_grants.requested': {
      data: {
        organisationId: string;
        appId: string;
        skipToken: string | null;
      };
    };
    'microsoft/third_party_apps.revoke_app_permission.requested': {
      data: {
        organisationId: string;
        appId: string;
        permissionId?: string;
        oauthGrantIds?: string[];
      };
    };
    'microsoft/third_party_apps.refresh_app_permission.requested': {
      data: {
        organisationId: string;
        appId: string;
        userId: string;
      };
    };
    'microsoft/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'microsoft/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'microsoft/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'microsoft/token.refresh.requested': {
      data: {
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
