import { FunctionHandler, inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '../common/data';
import { InputArgWithTrigger } from '@/inngest/types';
import { DBXApps } from '@/connectors/dropbox/dbx-apps';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'third-party-apps/delete-object'>) => {
  const { organisationId, userId, appId } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error(`Organisation not found with id=${organisationId}`);
  }

  const { accessToken } = organisation;

  const dbx = new DBXApps({
    accessToken,
  });

  await step.run('delete-third-party-apps-objects', async () => {
    return await dbx.deleteTeamMemberThirdPartyApp({
      teamMemberId: userId,
      appId,
    });
  });

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
