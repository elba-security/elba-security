import { FunctionHandler, inngest } from '@/common/clients/inngest';
import { DBXAppsFetcher } from '@/repositories/dropbox/clients';
import { handleError } from '../../handle-error';
import { elbaAccess } from '@/common/clients/elba';
import { InputArgWithTrigger } from '@/common/clients/types';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'third-party-apps/run-sync-jobs'>) => {
  const { organisationId, accessToken, cursor, syncStartedAt } = event.data;

  const dbxAppsFetcher = new DBXAppsFetcher({
    accessToken,
  });

  const elba = elbaAccess(organisationId);

  const memberApps = await step
    .run('third-party-apps-sync-initialize', async () => {
      const { apps, ...rest } = await dbxAppsFetcher.fetchTeamMembersThirdPartyApps(cursor);

      if (!apps?.length) {
        return rest;
      }

      await elba.thirdPartyApps.updateObjects({
        apps,
      });

      return rest;
    })
    .catch(handleError);

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
      run: 'event.data.isFirstScan ? 600 : 0',
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
