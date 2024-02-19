import { FunctionHandler, inngest } from '@/inngest/client';
import { getOrganisationAccessDetails } from '../common/data';
import { DBXPermissions } from '@/connectors';
import { InputArgWithTrigger } from '@/inngest/types';
import { decrypt } from '@/common/crypto';
import { NonRetriableError } from 'inngest';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'dropbox/data_protection.delete_object_permission.requested'>) => {
  const { organisationId } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new NonRetriableError(`Organisation not found with id=${organisationId}`);
  }

  const { accessToken, adminTeamMemberId } = organisation;

  const token = await decrypt(accessToken);

  const dbx = new DBXPermissions({
    accessToken: token,
    adminTeamMemberId,
  });

  await step.run('delete-permission', async () => {
    return await dbx.removePermissions(event.data);
  });
};

export const deleteObjectPermissions = inngest.createFunction(
  {
    id: 'dropbox-delete-data-protection-object-permission',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 10,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/data_protection.delete_object_permission.requested' },
  handler
);
