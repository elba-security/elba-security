import { decrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/dropbox/users';
import { createElbaClient } from '@/connectors/elba/client';
import { getOrganisation } from '@/database/organisations';
import { deleteSharedLinks } from '@/database/shared-links';
import { inngest } from '@/inngest/client';

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
  },
  { event: 'dropbox/data_protection.folder_and_files.start.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, cursor, syncStartedAt } = event.data;
    const organisation = await getOrganisation(organisationId);
    const elba = createElbaClient({ organisationId, region: organisation.region });
    const accessToken = await decrypt(organisation.accessToken);

    const { validUsers, cursor: nextCursor } = await step.run('list-users', async () => {
      return await getUsers({
        accessToken,
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
