import { decrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/dropbox/users';
import { getOrganisation } from '@/database/organisations';
import { inngest } from '@/inngest/client';

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
    const { organisationId, isFirstSync, syncStartedAt, cursor } = event.data;

    const organisation = await getOrganisation(organisationId);

    const accessToken = await decrypt(organisation.accessToken);

    const { validUsers, cursor: nextCursor } = await step.run('list-users', async () => {
      return await getUsers({
        accessToken,
        cursor,
      });
    });

    if (validUsers.length > 0) {
      const job = {
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
        organisationId,
        syncStartedAt,
        isFirstSync,
        cursor: null,
      },
    });
  }
);
