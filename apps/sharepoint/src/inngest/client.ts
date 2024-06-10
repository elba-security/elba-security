import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'sharepoint',
  schemas: new EventSchemas().fromRecord<{
    'sharepoint/users.sync.triggered': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'sharepoint/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'sharepoint/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'sharepoint/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'sharepoint/data_protection.sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
        skipToken: string | null;
      };
    };
    'sharepoint/drives.sync.triggered': {
      data: {
        siteId: string;
        organisationId: string;
        isFirstSync: boolean;
        skipToken: string | null;
      };
    };
    'sharepoint/items.sync.triggered': {
      data: {
        siteId: string;
        driveId: string;
        organisationId: string;
        isFirstSync: boolean;
        folder: {
          id: string | null;
          paginated: boolean;
          permissions: string[] | [];
        } | null;
        skipToken: string | null;
      };
    };
    'sharepoint/drives.sync.completed': {
      data: {
        organisationId: string;
        siteId: string;
      };
    };
    'sharepoint/items.sync.completed': {
      data: {
        organisationId: string;
        driveId: string;
      };
    };
    'sharepoint/foder-items.sync.completed': {
      data: {
        organisationId: string;
        folderId: string;
      };
    };
    'sharepoint/data_protection.refresh_object.requested': {
      data: {
        id: string;
        organisationId: string;
        metadata: {
          siteId: string;
          driveId: string;
        };
      };
    };
    'sharepoint/data_protection.delete_object_permissions.requested': {
      data: {
        id: string;
        organisationId: string;
        metadata: {
          siteId: string;
          driveId: string;
        };
        permissions: string[];
      };
    };
    'sharepoint/drives.subscription.triggered': {
      data: {
        organisationId: string;
        siteId: string;
        driveId: string;
        isFirstSync: boolean;
      };
    };
    'sharepoint/subscription.refresh.triggered': {
      data: {
        subscriptionId: string;
        organisationId: string;
      };
    };
    'sharepoint/subscription.remove.triggered': {
      data: {
        subscriptionId: string;
        organisationId: string;
      };
    };
    'sharepoint/subscription.remove.completed': {
      data: {
        subscriptionId: string;
        organisationId: string;
      };
    };
    'sharepoint/data_protection.initialize_delta.requested': {
      data: {
        organisationId: string;
        siteId: string;
        driveId: string;
        isFirstSync: boolean;
        skipToken: string | null;
      };
    };
    'sharepoint/update-items.triggered': {
      data: {
        siteId: string;
        driveId: string;
        subscriptionId: string;
        tenantId: string;
        skipToken: string | null;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware, sentryMiddleware],
  logger,
});
