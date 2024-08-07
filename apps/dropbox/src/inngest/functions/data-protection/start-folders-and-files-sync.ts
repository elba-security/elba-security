import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { DBXUsers, getElba } from '@/connectors';
import type { InputArgWithTrigger } from '@/inngest/types';
import { decrypt } from '@/common/crypto';
import { getOrganisationAccessDetails } from '../common/data';
import { deleteSharedLinks } from './data';

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

  const fileSyncJobs = team.members.map(({ id: teamMemberId }) => {
    return {
      ...event.data,
      teamMemberId,
    };
  });

  if (team.members.length > 0) {
    const waitForEvent = fileSyncJobs.map((fileSyncJob) =>
      step.waitForEvent(`wait-folder-and-file-sync-${fileSyncJob.teamMemberId}`, {
        event: 'dropbox/data_protection.folder_and_files.sync_page.completed',
        timeout: '1day',
        if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${fileSyncJob.teamMemberId}'`,
      })
    );

    await step.sendEvent(
      'sync-folder-and-files',
      fileSyncJobs.map((fileSyncJob) => ({
        name: 'dropbox/data_protection.folder_and_files.sync_page.requested',
        data: fileSyncJob,
      }))
    );

    await Promise.all(waitForEvent);
  }

  if (team.hasMore) {
    await step.sendEvent('start-folder-and-files-sync', {
      name: 'dropbox/data_protection.folder_and_files.start.sync_page.requested',
      data: {
        ...event.data,
        cursor: team.nextCursor,
      },
    });
    return;
  }

  await step.run('delete-objects', async () => {
    await elba.dataProtection.deleteObjects({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });

    await deleteSharedLinks(organisationId);
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
