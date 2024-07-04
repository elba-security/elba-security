import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import type {
  DataProtectionObjectMetadata,
  PageObjectPermissionMetadata,
  SpaceObjectPermissionMetadata,
} from '@/connectors/elba/data-protection/metadata';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';

export const inngest = new Inngest({
  id: 'confluence',
  schemas: new EventSchemas().fromRecord<{
    'confluence/token.refresh.requested': {
      data: {
        organisationId: string;
        expiresAt: number;
      };
    };
    'confluence/data_protection.delete_object_permissions.requested': {
      data: {
        objectId: string;
        organisationId: string;
        metadata: DataProtectionObjectMetadata;
        permissions: {
          id: string;
          metadata: SpaceObjectPermissionMetadata | PageObjectPermissionMetadata;
        }[];
      };
    };
    'confluence/data_protection.delete_page_restrictions.requested': {
      data: {
        organisationId: string;
        pageId: string;
        userIds: string[];
      };
    };
    'confluence/data_protection.delete_space_permissions.requested': {
      data: {
        organisationId: string;
        spaceKey: string;
        permissionIds: string[];
      };
    };
    'confluence/data_protection.refresh_object.requested': {
      data: {
        objectId: string;
        organisationId: string;
        metadata: DataProtectionObjectMetadata;
      };
    };
    'confluence/data_protection.pages.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        cursor: string | null;
      };
    };
    'confluence/data_protection.spaces.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        cursor: string | null;
        type: 'global' | 'personal';
      };
    };
    'confluence/users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        cursor: number | null;
      };
    };
    'confluence/users.group_users.sync.requested': {
      data: {
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        groupId: string;
        cursor: number | null;
      };
    };
    'confluence/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'confluence/app.uninstalled': {
      data: {
        organisationId: string;
      };
    };
  }>(),
  middleware: [rateLimitMiddleware],
  logger,
});
