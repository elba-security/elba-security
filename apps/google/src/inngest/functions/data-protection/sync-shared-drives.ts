import { and, eq, inArray } from 'drizzle-orm';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { listGoogleSharedDriveIds } from '@/connectors/google/drives';
import { listAllGoogleMembers } from '@/connectors/google/members';
import { listAllGoogleSharedDriveManagerPermissions } from '@/connectors/google/permissions';
import { db } from '@/database/client';
import { usersTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { env } from '@/common/env/server';

export type SyncDataProtectionSharedDrivesEvents = {
  'google/data_protection.sync.drives.shared.requested': SyncDataProtectionSharedDrivesRequested;
  'google/data_protection.sync.drives.shared.completed': SyncDataProtectionSharedDrivesCompleted;
};

type SyncDataProtectionSharedDrivesRequested = {
  data: {
    organisationId: string;
    region: string;
    googleAdminEmail: string;
    isFirstSync: boolean;
    pageToken: string | null;
  };
};

type SyncDataProtectionSharedDrivesCompleted = {
  data: {
    organisationId: string;
  };
};

export const syncDataProtectionSharedDrives = inngest.createFunction(
  {
    id: 'google-sync-data-protection-shared-drives',
    retries: 3,
    concurrency: {
      limit: env.DATA_PROTECTION_SYNC_SHARED_DRIVES_CONCURRENCY,
      key: 'event.data.isFirstSync',
    },
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
  },
  { event: 'google/data_protection.sync.drives.shared.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, region, isFirstSync, googleAdminEmail, pageToken } = event.data;

    const authClient = await getGoogleServiceAccountClient(googleAdminEmail, true);
    const { sharedDriveIds, nextPageToken: nextPage } = await step.run('list-shared-drives', () => {
      return listGoogleSharedDriveIds({
        auth: authClient,
        pageSize: env.DATA_PROTECTION_SYNC_SHARED_DRIVES_BATCH_SIZE,
        pageToken: pageToken ?? undefined,
      });
    });

    const sharedDriveResults = await Promise.allSettled(
      sharedDriveIds.map((sharedDriveId) =>
        step.run(`list-shared-drive-${sharedDriveId}-permissions`, async () => {
          const managerPermissions = await listAllGoogleSharedDriveManagerPermissions({
            auth: authClient,
            fileId: sharedDriveId,
            pageSize: 100, // Set pageSize to max value
          });

          // We get the manager from the managers list based on these criteria
          // - Admin if he is in the list
          // - If not, we want to get a manager that is a user if any
          // - If the above conditions doesn't apply, we fallback to the group manager
          const adminManager = managerPermissions.find(
            (perm) => perm.emailAddress === googleAdminEmail
          );
          const userManager = managerPermissions.find((perm) => perm.type === 'user');
          const groupManager = managerPermissions.find((perm) => perm.type === 'group');
          const manager = adminManager || userManager || groupManager;

          if (!manager) {
            logger.error('Shared drive manager not found', { organisationId, sharedDriveId });
            return null;
          }

          if (manager.type !== 'group') {
            return { sharedDriveId, managerUserId: null, managerEmail: manager.emailAddress };
          }

          const [groupOwner] = await listAllGoogleMembers({
            auth: authClient,
            groupKey: manager.emailAddress,
            roles: 'OWNER',
            maxResults: 200, // Set maxResults to max value
          });

          if (!groupOwner) {
            logger.error('Shared drive group owner not found', {
              organisationId,
              sharedDriveId,
              manager,
            });
            return null;
          }

          return { sharedDriveId, managerUserId: groupOwner.id, managerEmail: groupOwner.email };
        })
      )
    );

    const missingSharedDrivesManagerIds = new Map<string, string[]>();
    const sharedDrives: { sharedDriveId: string; managerUserId: string; managerEmail: string }[] =
      [];
    for (const sharedDriveResult of sharedDriveResults) {
      if (sharedDriveResult.status === 'fulfilled' && sharedDriveResult.value) {
        const { managerUserId, ...sharedDriveInfo } = sharedDriveResult.value;
        if (managerUserId) {
          sharedDrives.push(sharedDriveResult.value);
        } else {
          const managerDrives =
            missingSharedDrivesManagerIds.get(sharedDriveInfo.managerEmail) || [];
          managerDrives.push(sharedDriveInfo.sharedDriveId);
          missingSharedDrivesManagerIds.set(sharedDriveInfo.managerEmail, managerDrives);
        }
      }
    }

    if (missingSharedDrivesManagerIds.size) {
      const dbUsers = await step.run('get-users', () => {
        return db.query.usersTable.findMany({
          where: and(
            eq(usersTable.organisationId, organisationId),
            inArray(usersTable.email, [...missingSharedDrivesManagerIds.keys()])
          ),
          columns: { id: true, email: true },
        });
      });

      const users = new Map(dbUsers.map(({ email, id }) => [email, id]));
      for (const [managerEmail, managerSharedDriveIds] of missingSharedDrivesManagerIds.entries()) {
        const userId = users.get(managerEmail);
        if (userId) {
          for (const sharedDriveId of managerSharedDriveIds) {
            sharedDrives.push({ sharedDriveId, managerUserId: userId, managerEmail });
          }
        } else {
          logger.error('Shared drive manager user id not found', {
            organisationId,
            managerEmail,
            managerSharedDriveIds,
          });
        }
      }
    }

    if (sharedDrives.length) {
      await Promise.all([
        ...sharedDrives.map(({ sharedDriveId, managerUserId }) =>
          step.waitForEvent(`sync-shared-drive-${sharedDriveId}-completed`, {
            event: 'google/data_protection.sync.drive.completed',
            if: `async.data.organisationId == '${organisationId}' && async.data.managerUserId == '${managerUserId}' && async.data.driveId == '${sharedDriveId}'`,
            timeout: '30 days',
          })
        ),
        step.sendEvent(
          'sync-shared-drives',
          sharedDrives.map(({ sharedDriveId, managerUserId, managerEmail }) => ({
            name: 'google/data_protection.sync.drive.requested',
            data: {
              driveId: sharedDriveId,
              isFirstSync,
              managerEmail,
              managerUserId,
              organisationId,
              pageToken: null,
              region,
            },
          }))
        ),
      ]);
    }

    if (nextPage) {
      await step.sendEvent('sync-next-page-shared-drives', {
        name: 'google/data_protection.sync.drives.shared.requested',
        data: {
          ...event.data,
          pageToken: nextPage,
        },
      });

      return { status: 'ongoing' };
    }

    await step.sendEvent('sync-shared-drives-completed', {
      name: 'google/data_protection.sync.drives.shared.completed',
      data: { organisationId },
    });

    return { status: 'completed' };
  }
);
