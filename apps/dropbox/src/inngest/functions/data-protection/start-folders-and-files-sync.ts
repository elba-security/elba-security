import { inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '../common/data';
import { DBXUsers, getElba } from '@/connectors';
import { InputArgWithTrigger } from '@/inngest/types';
import { decrypt } from '@/common/crypto';
import { NonRetriableError } from 'inngest';

const handler: Parameters<typeof inngest.createFunction>[2] = async ({
  event,
  step,
}: InputArgWithTrigger<'dropbox/data_protection.folder_and_files.start.sync_page.requested'>) => {
  const { organisationId, cursor, syncStartedAt } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new NonRetriableError(
      `Access token not found for organisation with ID: ${organisationId}`
    );
  }

  const { accessToken, region } = organisation;

  const token = await decrypt(accessToken);

  const dbxUsers = new DBXUsers({
    accessToken: token,
  });

  const elba = getElba({
    organisationId,
    region,
  });

  const team = await step.run('fetch-users', async () => {
    return dbxUsers.fetchUsers(cursor);
  });

  if (!team) {
    throw new Error(`Users not found for the organisation  with ID: ${organisationId}`);
  }

  const fileSyncJobs = team.members.map(({ id: teamMemberId }) => {
    return {
      ...event.data,
      teamMemberId,
    };
  });

  if (team.members.length > 0) {
    await step.sendEvent(
      'sync-folder-and-files',
      fileSyncJobs.map((fileSyncJob) => ({
        name: 'dropbox/data_protection.folder_and_files.sync_page.requested',
        data: fileSyncJob,
      }))
    );
  }

  if (team.hasMore) {
    return await step.sendEvent('start-folder-and-files-sync', {
      name: 'dropbox/data_protection.folder_and_files.start.sync_page.requested',
      data: {
        ...event.data,
        cursor: team.nextCursor,
      },
    });
  }

  await step.run('delete-objects', async () => {
    await elba.dataProtection.deleteObjects({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });
};

export const startFolderAndFileSync = inngest.createFunction(
  {
    id: 'dropbox-start-folder-and-files-sync',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 1,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/data_protection.folder_and_files.start.sync_page.requested' },
  handler
);
