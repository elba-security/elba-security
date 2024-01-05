import { FunctionHandler, inngest } from '@/common/clients/inngest';
import { InputArgWithTrigger } from '@/common/clients/types';
import { DBXAppsFetcher } from '@/repositories/dropbox/clients';
import { handleError } from '../../handle-error';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'third-party-apps/delete-object'>) => {
  const { accessToken, teamMemberId, appId } = event.data;

  const dbxAppsFetcher = new DBXAppsFetcher({
    accessToken,
  });

  await step
    .run('delete-third-party-apps-objects', async () => {
      return await dbxAppsFetcher.deleteTeamMemberThirdPartyApp({
        teamMemberId,
        appId,
      });
    })
    .catch(handleError);

  return {
    success: true,
  };
};

export const deleteThirdPartyAppsObject = inngest.createFunction(
  {
    id: 'third-party-apps-delete-objects',
    retries: 10,
    concurrency: {
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  { event: 'third-party-apps/delete-object' },
  handler
);
