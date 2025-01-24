import { EventSchemas, Inngest } from 'inngest';
import { logger } from '@elba-security/logger';
import { type ConnectionErrorType } from '@elba-security/sdk';
import { createElbaTrialIssuesLimitExceededMiddleware } from '@elba-security/inngest';
import { type FileMetadata, type Permission } from '@/connectors/elba/data-protection/files';
import { rateLimitMiddleware } from './middlewares/rate-limit-middleware';
import { elbaConnectionErrorMiddleware } from './middlewares/elba-connection-error-middleware';

export const inngest = new Inngest({
  id: 'dropbox',
  schemas: new EventSchemas().fromRecord<{
    'dropbox/app.installed': {
      data: {
        organisationId: string;
      };
    };
    'dropbox/app.uninstalled': {
      data: {
        organisationId: string;
        region: string;
        errorType: ConnectionErrorType;
        errorMetadata?: unknown;
      };
    };
    'dropbox/users.sync.requested': {
      data: {
        organisationId: string;
        region: string;
        nangoConnectionId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        cursor: string | null;
      };
    };
    'dropbox/users.delete.requested': {
      data: {
        organisationId: string;
        userId: string;
        region: string;
        nangoConnectionId: string;
      };
    };
    'dropbox/third_party_apps.sync.requested': {
      data: {
        region: string;
        nangoConnectionId: string;
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        cursor: string | null;
      };
    };
    'dropbox/third_party_apps.refresh_objects.requested': {
      data: {
        region: string;
        nangoConnectionId: string;
        organisationId: string;
        userId: string;
        appId: string;
        isFirstSync: boolean;
      };
    };
    'dropbox/third_party_apps.delete_object.requested': {
      data: {
        region: string;
        nangoConnectionId: string;
        organisationId: string;
        userId: string;
        appId: string;
      };
    };
    'dropbox/data_protection.shared_links.start.sync.requested': {
      data: {
        region: string;
        nangoConnectionId: string;
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        cursor: string | null;
      };
    };
    'dropbox/data_protection.shared_links.sync.requested': {
      data: {
        region: string;
        nangoConnectionId: string;
        organisationId: string;
        teamMemberId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
        cursor: string | null;
        pathRoot: string | null;
        isPersonal: boolean;
      };
    };
    'dropbox/data_protection.shared_links.sync.completed': {
      data: {
        region: string;
        nangoConnectionId: string;
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        isPersonal: boolean;
      };
    };
    'dropbox/data_protection.folder_and_files.start.sync.requested': {
      data: {
        region: string;
        nangoConnectionId: string;
        organisationId: string;
        isFirstSync: boolean;
        syncStartedAt: number;
        cursor: string | null;
      };
    };
    'dropbox/data_protection.folder_and_files.sync.requested': {
      data: {
        region: string;
        nangoConnectionId: string;
        organisationId: string;
        syncStartedAt: number;
        isFirstSync: boolean;
        teamMemberId: string;
        cursor: string | null;
      };
    };
    'dropbox/data_protection.folder_and_files.sync.completed': {
      data: {
        organisationId: string;
        teamMemberId: string;
      };
    };
    'dropbox/data_protection.refresh_object.requested': {
      data: {
        region: string;
        nangoConnectionId: string;
        id: string;
        organisationId: string;
        metadata: FileMetadata;
      };
    };
    'dropbox/data_protection.delete_object_permission.requested': {
      data: {
        region: string;
        nangoConnectionId: string;
        objectId: string;
        organisationId: string;
        metadata: FileMetadata;
        permission: Permission;
      };
    };
    'dropbox/sync.cancel': {
      data: {
        organisationId: string;
      };
    };
  }>(),
  middleware: [
    rateLimitMiddleware,
    elbaConnectionErrorMiddleware,
    createElbaTrialIssuesLimitExceededMiddleware('dropbox/sync.cancel'),
  ],
  logger,
});
