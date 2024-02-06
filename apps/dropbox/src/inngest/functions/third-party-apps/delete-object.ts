import { FunctionHandler, inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '../common/data';
import { InputArgWithTrigger } from '@/inngest/types';
import { DBXApps } from '@/connectors/dropbox/dbx-apps';
import { decrypt } from '@/common/crypto';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'dropbox/third_party_apps.delete_object.requested'>) => {
  const { organisationId, userId, appId } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new Error(`Organisation not found with id=${organisationId}`);
  }
  const token = await decrypt(organisation.accessToken);

  const dbx = new DBXApps({
    accessToken: token,
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
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/third_party_apps.delete_object.requested' },
  handler
);
