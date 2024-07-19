import { asc, eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { usersTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { env } from '@/common/env/server';

export type SyncDataProtectionPersonalDrivesEvents = {
  'google/data_protection.sync.drives.personal.requested': SyncDataProtectionPersonalDrivesRequested;
  'google/data_protection.sync.drives.personal.completed': SyncDataProtectionPersonalDrivesCompleted;
};

type SyncDataProtectionPersonalDrivesRequested = {
  data: {
    organisationId: string;
    region: string;
    googleAdminEmail: string;
    isFirstSync: boolean;
    pageToken: number | null;
  };
};

type SyncDataProtectionPersonalDrivesCompleted = {
  data: {
    organisationId: string;
  };
};

export const syncDataProtectionPersonalDrives = inngest.createFunction(
  {
    id: 'google-sync-data-protection-personal-drives',
    retries: 3,
    concurrency: {
      limit: env.DATA_PROTECTION_SYNC_PERSONAL_DRIVES_CONCURRENCY,
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
  { event: 'google/data_protection.sync.drives.personal.requested' },
  async ({ event, step }) => {
    const { organisationId, region, isFirstSync } = event.data;
    const pageToken = event.data.pageToken ?? 0;

    const { users, nextPageToken: nextPage } = await step.run('list-users', async () => {
      const dbUsers = await db.query.usersTable.findMany({
        where: eq(usersTable.organisationId, organisationId),
        orderBy: asc(usersTable.id),
        offset: pageToken,
        limit: env.DATA_PROTECTION_SYNC_PERSONAL_DRIVES_BATCH_SIZE,
        columns: {
          id: true,
          email: true,
        },
      });

      return { users: dbUsers, nextPageToken: dbUsers.length ? pageToken + dbUsers.length : null };
    });

    if (users.length) {
      const eventsToWait = users.map((user) =>
        step.waitForEvent(`sync-personal-drive-${user.id}-completed`, {
          event: 'google/data_protection.sync.drive.completed',
          if: `async.data.organisationId == '${organisationId}' && async.data.managerUserId == '${user.id}' && async.data.driveId == null`,
          timeout: '1day',
        })
      );

      await step.sendEvent(
        'sync-personal-drives',
        users.map((user) => ({
          name: 'google/data_protection.sync.drive.requested',
          data: {
            driveId: null,
            isFirstSync,
            managerEmail: user.email,
            managerUserId: user.id,
            organisationId,
            pageToken: null,
            region,
          },
        }))
      );

      await Promise.all(eventsToWait);
    }

    if (nextPage) {
      await step.sendEvent('sync-next-page-personal-drives', {
        name: 'google/data_protection.sync.drives.personal.requested',
        data: {
          ...event.data,
          pageToken: nextPage,
        },
      });

      return { status: 'ongoing' };
    }

    await step.sendEvent('sync-personal-drives-completed', {
      name: 'google/data_protection.sync.drives.personal.completed',
      data: { organisationId },
    });

    return { status: 'completed' };
  }
);
