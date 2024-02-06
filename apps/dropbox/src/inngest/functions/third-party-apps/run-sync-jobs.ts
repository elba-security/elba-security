import { FunctionHandler, inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '../common/data';
import { InputArgWithTrigger } from '@/inngest/types';
import { DBXApps } from '@/connectors/dropbox/dbx-apps';
import { getElba } from '@/connectors';
import { decrypt } from '@/common/crypto';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'third-party-apps/run-sync-jobs'>) => {
  const { organisationId, cursor, syncStartedAt } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error(`Access token not found for organisation with ID: ${organisationId}`);
  }

  const { accessToken, region } = organisation;
  const token = await decrypt(accessToken);

  const dbx = new DBXApps({
    accessToken: token,
  });

  const elba = getElba({
    organisationId,
    region,
  });

  const memberApps = await step.run('third-party-apps-sync-initialize', async () => {
    const { apps, ...rest } = await dbx.fetchTeamMembersThirdPartyApps(cursor);

    if (!apps?.length) {
      return rest;
    }

    await elba.thirdPartyApps.updateObjects({
      apps,
    });

    return rest;
  });

  if (memberApps?.hasMore) {
    await step.sendEvent('third-party-apps-run-sync-jobs', {
      name: 'third-party-apps/run-sync-jobs',
      data: {
        ...event.data,
        cursor: memberApps.nextCursor,
      },
    });

    return {
      success: true,
    };
  }

  await step.run('third-party-apps-sync-finalize', async () => {
    return elba.thirdPartyApps.deleteObjects({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });

  return {
    success: true,
  };
};

export const runThirdPartyAppsSyncJobs = inngest.createFunction(
  {
    id: 'run-third-party-apps-sync-jobs',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 1,
      key: 'event.data.organisationId',
    },
  },
  { event: 'third-party-apps/run-sync-jobs' },
  handler
);
