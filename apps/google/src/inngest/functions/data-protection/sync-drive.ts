import type { DataProtectionObject } from '@elba-security/sdk';
import { inngest } from '@/inngest/client';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { listGoogleFiles } from '@/connectors/google/files';
import { listAllGoogleFileNonInheritedPermissions } from '@/connectors/google/permissions';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection';
import { getElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env/server';

export type SyncDataProtectionDriveEvents = {
  'google/data_protection.sync.drive.requested': SyncDataProtectionDriveRequested;
  'google/data_protection.sync.drive.completed': SyncDataProtectionDriveCompleted;
};

type SyncDataProtectionDriveRequested = {
  data: {
    organisationId: string;
    region: string;
    managerUserId: string;
    managerEmail: string;
    driveId: string | null;
    isFirstSync: boolean;
    pageToken: string | null;
  };
};

type SyncDataProtectionDriveCompleted = {
  data: {
    organisationId: string;
    managerUserId: string;
    driveId: string | null;
  };
};

export const syncDataProtectionDrive = inngest.createFunction(
  {
    id: 'google-sync-data-protection-drive',
    retries: 1,
    concurrency: [
      {
        key: 'event.data.isFirstSync',
        limit: env.DATA_PROTECTION_SYNC_CONCURRENCY,
      },
    ],
    cancelOn: [
      {
        event: 'google/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'google/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
    ],
    onFailure: async ({ step, event }) => {
      await step.sendEvent('failed', {
        name: 'google/data_protection.sync.drive.completed',
        data: {
          driveId: event.data.event.data.driveId,
          managerUserId: event.data.event.data.managerUserId,
          organisationId: event.data.event.data.organisationId,
        },
      });
    },
  },
  { event: 'google/data_protection.sync.drive.requested' },
  async ({ event, step }) => {
    const { organisationId, region, driveId, managerEmail, managerUserId, pageToken } = event.data;

    const authClient = await getGoogleServiceAccountClient(managerEmail);
    const { files, nextPageToken: nextPage } = await step.run('list-files', async () => {
      return listGoogleFiles({
        auth: authClient,
        pageToken: pageToken ?? undefined,
        pageSize: env.DATA_PROTECTION_SYNC_BATCH_SIZE,
        ...(driveId
          ? {
              driveId,
              supportsAllDrives: true,
              includeItemsFromAllDrives: true,
              corpora: 'drive',
            }
          : {
              q: `"${managerEmail}" in owners and mimeType != 'application/vnd.google-apps.folder'`,
            }),
      });
    });

    const objects = await step.run('list-files-permissions', async () => {
      const filesPermissionsResult = await Promise.allSettled(
        files.map(async (googleFile) => {
          const filePermissions = await listAllGoogleFileNonInheritedPermissions({
            auth: authClient,
            fileId: googleFile.id,
            ...(driveId ? { pageSize: 100 } : {}), // For personal drives, we can retrieve every permissions by omitting pageSize
          });

          if (!filePermissions.length) {
            return null;
          }

          return formatDataProtectionObject({
            file: googleFile,
            owner: managerUserId,
            permissions: filePermissions,
          });
        })
      );

      const dataProtectionObjects: DataProtectionObject[] = [];
      for (const filePermissionsResult of filesPermissionsResult) {
        if (filePermissionsResult.status === 'fulfilled' && filePermissionsResult.value) {
          dataProtectionObjects.push(filePermissionsResult.value);
        }
      }

      return dataProtectionObjects;
    });

    await step.run('finalize', async () => {
      const elba = getElbaClient({ organisationId, region });
      await elba.dataProtection.updateObjects({ objects });
    });

    if (nextPage) {
      await step.sendEvent('sync-files', {
        name: 'google/data_protection.sync.drive.requested',
        data: {
          ...event.data,
          pageToken: nextPage,
        },
      });

      return { status: 'ongoing' };
    }

    await step.sendEvent('sync-next-page-files', {
      name: 'google/data_protection.sync.drive.completed',
      data: {
        driveId,
        managerUserId,
        organisationId,
      },
    });

    return { status: 'completed' };
  }
);
