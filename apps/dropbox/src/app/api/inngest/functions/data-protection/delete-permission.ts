import { InngestFunctionInputArg, inngest } from '@/common/clients/inngest';
import { DBXRevoker } from '@/repositories/dropbox/clients/DBXRevoker';
import { getOrganisationsAccessToken } from './data';
import { handleError } from '../../handle-error';

const handler: Parameters<typeof inngest.createFunction>[2] = async ({
  event,
  step,
}: InngestFunctionInputArg) => {
  const { organisationId, sourceObjectId, teamMemberId, type, isPersonal } = event.data;

  const organisations = await getOrganisationsAccessToken(organisationId);

  const organisation = organisations.at(0);

  if (!organisation) {
    throw new Error('No access token found for the organisation');
  }

  const { accessToken, adminTeamMemberId } = organisation;

  const dbxRevoker = new DBXRevoker({
    accessToken,
    isPersonal,
    teamMemberId,
    adminTeamMemberId,
  });

  // TODO:
  // 1. How to get the email?
  // 2. How to get the sharedLink?
  // 3. How to get the fileId?

  step
    .run('delete-object-permissions', async () => {
      if (type === 'folder') {
        await dbxRevoker.deleteFilePermission({
          fileId: sourceObjectId,
          email: 'email',
        });
      }

      if (type === 'file') {
        await dbxRevoker.deleteFilePermission({
          fileId: sourceObjectId,
          email: 'email',
        });
      }

      if (type === 'sharedLink') {
        await dbxRevoker.deleteSharedLink({
          sharedLink: 'sharedLink',
        });
      }
    })
    .catch(handleError);

  return {
    success: true,
  };
};

export const deletePermissionOrSharedLink = inngest.createFunction(
  {
    id: 'data-protection/delete-permission',
    retries: 10,
    concurrency: {
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  {
    event: 'data-protection/delete-permission',
  },
  handler
);
