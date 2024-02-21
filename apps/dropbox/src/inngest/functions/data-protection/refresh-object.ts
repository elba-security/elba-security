import { FunctionHandler, inngest } from '@/inngest/client';
import { InputArgWithTrigger } from '@/inngest/types';
import { getOrganisationAccessDetails } from '../common/data';
import { DBXFiles, getElba } from '@/connectors';
import { decrypt } from '@/common/crypto';
import { FileOrFolder } from '@/connectors/types';
import { NonRetriableError } from 'inngest';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'dropbox/data_protection.refresh_object.requested'>) => {
  const {
    id: sourceObjectId,
    organisationId,
    metadata: { ownerId, type, isPersonal },
  } = event.data;

  const isFile = type === 'file';
  const path = isFile ? sourceObjectId : `ns:${sourceObjectId}`;

  if (!ownerId) {
    throw new Error('Cannot refresh a Dropbox object without an owner');
  }

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new NonRetriableError(`Organisation not found with id=${organisationId}`);
  }

  const { accessToken, adminTeamMemberId, pathRoot, region } = organisation;

  const token = await decrypt(accessToken);

  const dbx = new DBXFiles({
    accessToken: token,
    teamMemberId: ownerId,
    adminTeamMemberId,
    pathRoot,
  });

  const elba = getElba({
    organisationId,
    region,
  });

  await step.run('fetch-object', async () => {
    const fileMetadata = (await dbx.fetchFolderOrFileMetadataByPath({
      isPersonal,
      path,
    })) as FileOrFolder;

    if (!fileMetadata.path_lower) {
      return await elba.dataProtection.deleteObjects({
        ids: [sourceObjectId],
      });
    }

    const sharedLinks = await dbx.fetchSharedLinksByPath({
      isPersonal,
      path,
    });

    const folderOrFileToAdd = await dbx.fetchMetadataMembersAndMapDetails({
      foldersAndFiles: [fileMetadata],
      sharedLinks,
    });

    await elba.dataProtection.updateObjects({
      objects: folderOrFileToAdd,
    });
  });
};

export const refreshObject = inngest.createFunction(
  {
    id: 'dropbox-data-protection-refresh-object',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 10,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/data_protection.refresh_object.requested' },
  handler
);
