import { elbaAccess } from '@/common/clients/elba';
import { FunctionHandler, inngest } from '@/common/clients/inngest';
import { InputArgWithTrigger } from '@/common/clients/types';
import { DBXAppsFetcher } from '@/repositories/dropbox/clients';
import { handleError } from '../../handle-error';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'third-party-apps/refresh-objects'>) => {
  const { organisationId, accessToken, teamMemberId } = event.data;

  const dbxAppsFetcher = new DBXAppsFetcher({
    accessToken,
  });

  const elba = elbaAccess(organisationId);

  await step
    .run('refresh-third-party-apps-objects', async () => {
      const { apps } = await dbxAppsFetcher.fetchTeamMemberThirdPartyApps(teamMemberId);

      if (apps.length > 0) {
        await elba.thirdPartyApps.updateObjects({
          apps,
        });
      }

      // TODO: Delete apps that are not in the list
      // Find out how to get the list of apps that are not in the list
      return true;
    })
    .catch(handleError);

  return {
    success: true,
  };
};

export const refreshThirdPartyAppsObject = inngest.createFunction(
  {
    id: 'third-party-apps-refresh-objects',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  { event: 'third-party-apps/refresh-objects' },
  handler
);
