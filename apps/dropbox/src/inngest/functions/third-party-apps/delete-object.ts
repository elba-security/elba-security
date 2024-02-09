import { FunctionHandler, inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '../common/data';
import { InputArgWithTrigger } from '@/inngest/types';
import { DBXApps } from '@/connectors/dropbox/dbx-apps';
import { decrypt } from '@/common/crypto';
import { env } from '@/env';
import { NonRetriableError } from 'inngest';

const handler: FunctionHandler = async ({
  event,
}: InputArgWithTrigger<'dropbox/third_party_apps.delete_object.requested'>) => {
  const { organisationId, userId, appId } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new NonRetriableError(`Organisation not found with id=${organisationId}`);
  }
  const token = await decrypt(organisation.accessToken);

  const dbx = new DBXApps({
    accessToken: token,
  });

  await dbx.deleteTeamMemberThirdPartyApp({
    teamMemberId: userId,
    appId,
  });
};

export const deleteThirdPartyAppsObject = inngest.createFunction(
  {
    id: 'dropbox-third-party-apps-delete-objects',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: env.DROPBOX_TPA_DELETE_OBJECT_RETRIES,
    concurrency: {
      limit: env.DROPBOX_TPA_DELETE_OBJECT_CONCURRENCY,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/third_party_apps.delete_object.requested' },
  handler
);
