import { EventSchemas, Inngest } from 'inngest';
import { sentryMiddleware } from '@elba-security/inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'share-point',
  schemas: new EventSchemas().fromRecord<{
    'share-point/users.sync.triggered': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'share-point/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'share-point/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'share-point/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'share-point/data_protection.sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
        skipToken: string | null;
      };
    };
    'share-point/drives.sync.triggered': {
      data: {
        siteId: string;
        organisationId: string;
        isFirstSync: boolean;
        skipToken: string | null;
      };
    };
    'share-point/items.sync.triggered': {
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
    'share-point/drives.sync.completed': {
      data: {
        organisationId: string;
        siteId: string;
      };
    };
    'share-point/items.sync.completed': {
      data: {
        organisationId: string;
        driveId: string;
      };
    };
    'share-point/foder-items.sync.completed': {
      data: {
        organisationId: string;
        folderId: string;
      };
    };
    'share-point/data_protection.refresh_object.requested': {
      data: {
        id: string;
        organisationId: string;
        metadata: {
          siteId: string;
          driveId: string;
        };
      };
    };
    'share-point/data_protection.delete_object_permissions.requested': {
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
    'share-point/drives.subscription.triggered': {
      data: {
        organisationId: string;
        siteId: string;
        driveId: string;
        isFirstSync: boolean;
      };
    };
    'share-point/subscription.refresh.triggered': {
      data: {
        subscriptionId: string;
        organisationId: string;
      };
    };
    'share-point/subscription.remove.triggered': {
      data: {
        subscriptionId: string;
        organisationId: string;
      };
    };
    'share-point/subscription.remove.completed': {
      data: {
        subscriptionId: string;
        organisationId: string;
      };
    };
    'share-point/data_protection.initialize_delta.requested': {
      data: {
        organisationId: string;
        siteId: string;
        driveId: string;
        isFirstSync: boolean;
        skipToken: string | null;
      };
    };
    'share-point/update-items.triggered': {
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
