import { NonRetriableError } from 'inngest';
import type { FunctionHandler } from '@/inngest/client';
import { inngest } from '@/inngest/client';
import type { InputArgWithTrigger } from '@/inngest/types';
import { DBXUsers } from '@/connectors';
import { decrypt } from '@/common/crypto';
import type { ExtendedTeamMemberProfile, SyncJob } from '@/connectors/types';
import { getOrganisationAccessDetails } from '../common/data';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'dropbox/data_protection.shared_link.start.sync_page.requested'>) => {
  const { organisationId, isFirstSync, syncStartedAt, cursor } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new NonRetriableError(
      `Access token not found for organisation with ID: ${organisationId}`
    );
  }

  const token = await decrypt(organisation.accessToken);

  const dbxUsers = new DBXUsers({
    accessToken: token,
  });

  const team = await step.run('run-fetch-users', async () => {
    return dbxUsers.fetchUsers(cursor);
  });

  const job: SyncJob = {
    organisationId,
    syncStartedAt,
    isFirstSync,
  };

  const sharedLinkJobs = team.unFormattedMembers.flatMap(({ profile }) => {
    return [
      {
        ...job,
        teamMemberId: profile.team_member_id,
        isPersonal: false,
        pathRoot: (profile as ExtendedTeamMemberProfile).root_folder_id,
      },
      {
        ...job,
        teamMemberId: profile.team_member_id,
        isPersonal: true,
      },
    ];
  });

  if (team.members.length > 0) {
    const eventsToWait = sharedLinkJobs.map((sharedLinkJob) =>
      step.waitForEvent(`wait-sync-shared-links`, {
        event: 'dropbox/data_protection.synchronize_shared_links.sync_page.completed',
        timeout: '1day',
        if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${sharedLinkJob.teamMemberId}' && async.data.isPersonal == ${sharedLinkJob.isPersonal}`,
      })
    );

    await step.sendEvent(
      'sync-shared-links',
      sharedLinkJobs.map((sharedLinkJob) => ({
        name: 'dropbox/data_protection.shared_links.sync_page.requested',
        data: sharedLinkJob,
      }))
    );

    await Promise.all(eventsToWait);
  }

  if (team.hasMore) {
    await step.sendEvent('start-shared-link-sync', {
      name: 'dropbox/data_protection.shared_link.start.sync_page.requested',
      data: {
        ...event.data,
        cursor: team.nextCursor,
      },
    });
    return;
  }

  // Once all the shared links are fetched,
  // Create start folder-and-file sync for the organisation
  await step.sendEvent('start-folder-and-files-sync', {
    name: 'dropbox/data_protection.folder_and_files.start.sync_page.requested',
    data: {
      organisationId,
      syncStartedAt,
      isFirstSync,
    },
  });
};

export const startSharedLinkSync = inngest.createFunction(
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
  { event: 'dropbox/data_protection.shared_link.start.sync_page.requested' },
  handler
);
