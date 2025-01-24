import { getUsers } from '@/connectors/dropbox/users';
import { deleteSharedLinks } from '@/database/shared-links';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';

export const startFolderAndFileSync = inngest.createFunction(
  {
    id: 'dropbox-start-folder-and-files-sync',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 5,
    concurrency: {
      limit: 1,
      key: 'event.data.organisationId',
    },
    cancelOn: [
      {
        event: 'dropbox/sync.cancel',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'dropbox/data_protection.folder_and_files.start.sync.requested',
  },
  async ({ event, step }) => {
    const { organisationId, cursor, syncStartedAt, nangoConnectionId, region } = event.data;
    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });
    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new Error('Could not retrieve Nango credentials');
    }

    const { validUsers, cursor: nextCursor } = await step.run('list-users', async () => {
      return await getUsers({
        accessToken: credentials.access_token,
        cursor,
      });
    });

    if (validUsers.length > 0) {
      await Promise.all([
        ...validUsers.map(({ profile }) =>
          step.waitForEvent(`wait-folder-and-file-sync-${profile.team_member_id}`, {
            event: 'dropbox/data_protection.folder_and_files.sync.completed',
            timeout: '1day',
            if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${profile.team_member_id}'`,
          })
        ),
        step.sendEvent(
          'sync-folder-and-files',
          validUsers.map((user) => ({
            name: 'dropbox/data_protection.folder_and_files.sync.requested',
            data: {
              nangoConnectionId,
              region,
              organisationId,
              teamMemberId: user.profile.team_member_id,
              syncStartedAt,
              isFirstSync: false,
              cursor: null,
            },
          }))
        ),
      ]);
    }

    if (nextCursor) {
      await step.sendEvent('start-folder-and-files-sync', {
        name: 'dropbox/data_protection.folder_and_files.start.sync.requested',
        data: {
          ...event.data,
          cursor: nextCursor,
        },
      });
      return { status: 'ongoing' };
    }
    await step.run('delete-objects', async () => {
      await elba.dataProtection.deleteObjects({
        syncedBefore: new Date(syncStartedAt).toISOString(),
      });
      await deleteSharedLinks(organisationId);
    });
  }
);
