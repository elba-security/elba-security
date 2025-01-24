import { getUsers } from '@/connectors/dropbox/users';
import { inngest } from '@/inngest/client';
import { nangoAPIClient } from '@/common/nango';

export const startSharedLinksSync = inngest.createFunction(
  {
    id: 'dropbox-start-shared-link-sync',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/data_protection.shared_links.start.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, isFirstSync, syncStartedAt, cursor, nangoConnectionId, region } = event.data;

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
      const job = {
        region,
        nangoConnectionId,
        organisationId,
        syncStartedAt,
        isFirstSync,
      };

      const sharedLinkJobs = validUsers.flatMap(({ profile }) => {
        return [
          {
            ...job,
            teamMemberId: profile.team_member_id,
            isPersonal: false,
            pathRoot: profile.root_folder_id,
            cursor: null,
          },
          {
            ...job,
            teamMemberId: profile.team_member_id,
            isPersonal: true,
            pathRoot: null,
            cursor: null,
          },
        ];
      });

      await Promise.all([
        ...sharedLinkJobs.map((sharedLinkJob) =>
          step.waitForEvent(`wait-sync-shared-links`, {
            event: 'dropbox/data_protection.shared_links.sync.completed',
            timeout: '1 day',
            if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${sharedLinkJob.teamMemberId}' && async.data.isPersonal == ${sharedLinkJob.isPersonal}`,
          })
        ),
        step.sendEvent(
          'sync-shared-links',
          sharedLinkJobs.map((sharedLinkJob) => ({
            name: 'dropbox/data_protection.shared_links.sync.requested',
            data: sharedLinkJob,
          }))
        ),
      ]);
    }

    if (nextCursor) {
      await step.sendEvent('start-shared-link-sync', {
        name: 'dropbox/data_protection.shared_links.start.sync.requested',
        data: {
          ...event.data,
          cursor: nextCursor,
        },
      });
      return { status: 'ongoing' };
    }

    // Once all the shared links are fetched,
    // Create start folder-and-file sync for the organisation
    await step.sendEvent('start-folder-and-files-sync', {
      name: 'dropbox/data_protection.folder_and_files.start.sync.requested',
      data: {
        region,
        nangoConnectionId,
        organisationId,
        syncStartedAt,
        isFirstSync,
        cursor: null,
      },
    });
  }
);
