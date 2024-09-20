import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import type { ElbaPermissionToDelete } from './functions/data-protection/common/types';

export const inngest = new Inngest({
  id: 'onedrive',
  schemas: new EventSchemas().fromRecord<{
    'onedrive/users.sync.triggered': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        skipToken: string | null;
      };
    };
    'onedrive/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'onedrive/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
    'onedrive/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'onedrive/data_protection.sync.requested': {
      data: {
        organisationId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
        skipToken: string | null;
      };
    };
    'onedrive/items.sync.triggered': {
      data: {
        userId: string;
        organisationId: string;
        isFirstSync: boolean;
        skipToken: string | null;
      };
    };
    'onedrive/items.sync.completed': {
      data: {
        organisationId: string;
        userId: string;
      };
    };
    'onedrive/data_protection.refresh_object.requested': {
      data: {
        id: string;
        organisationId: string;
        metadata: {
          userId: string;
        };
      };
    };
    'onedrive/data_protection.delete_object_permissions.requested': {
      data: {
        id: string;
        organisationId: string;
        metadata: {
          userId: string;
        };
        permissions: ElbaPermissionToDelete[];
      };
    };
    'onedrive/subscriptions.create.triggered': {
      data: {
        organisationId: string;
        userId: string;
        isFirstSync: boolean;
      };
    };
    'onedrive/subscriptions.refresh.triggered': {
      data: {
        subscriptionId: string;
        organisationId: string;
      };
    };
    'onedrive/subscriptions.remove.triggered': {
      data: {
        subscriptionId: string;
        organisationId: string;
      };
    };
    'onedrive/subscriptions.remove.completed': {
      data: {
        subscriptionId: string;
        organisationId: string;
      };
    };
    'onedrive/delta.initialize.requested': {
      data: {
        organisationId: string;
        userId: string;
        isFirstSync: boolean;
      };
    };
    'onedrive/delta.sync.triggered': {
      data: {
        userId: string;
        subscriptionId: string;
        tenantId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
