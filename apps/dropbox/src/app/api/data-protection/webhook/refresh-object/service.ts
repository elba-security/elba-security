import { DBXFetcher } from '@/repositories/dropbox/clients/DBXFetcher';
import { getOrganisationsAccessToken } from './data';
import { DropboxResponseError } from 'dropbox';
import { elbaAccess } from '@/common/clients/elba';

type RefreshDataProtectionObject = {
  id: string;
  organisationId: string;
  metadata: {
    type: string;
    isPersonal: boolean;
    userId: string;
  };
};

export const refreshDataProtectionObject = async ({
  organisationId,
  id: sourceObjectId,
  metadata: { userId, isPersonal, type },
}: RefreshDataProtectionObject) => {
  if (!userId) {
    throw new Error('Cannot refresh a Dropbox object without an owner');
  }

  const organisations = await getOrganisationsAccessToken(organisationId);

  const organisation = organisations.at(0);

  if (!organisation) {
    throw new Error('No access token found for the organisation');
  }

  const { accessToken, pathRoot } = organisation;

  const isFile = type === 'file';
  const path = isFile ? sourceObjectId : `ns:${sourceObjectId}`;

  const dbxFetcher = new DBXFetcher({
    accessToken,
    teamMemberId: userId,
    pathRoot,
  });

  const elba = elbaAccess(organisationId);

  try {
    const sharedLinks = await dbxFetcher.fetchSharedLinksByPath({
      organisationId,
      teamMemberId: userId,
      isPersonal,
      path,
    });

    const fileMetadata = await dbxFetcher.fetchFolderOrFileMetadataByPath({
      isPersonal,
      path,
    });

    if (!fileMetadata.path_lower) {
      await elba.dataProtection.deleteObjects({
        ids: [sourceObjectId],
      });

      return {
        success: true,
      };
    }

    const folderOrFileToAdd = await dbxFetcher.fetchMetadataMembersAndMapDetails({
      foldersAndFiles: [fileMetadata],
      sharedLinks,
    });

    if (folderOrFileToAdd.length > 0) {
      await elba.dataProtection.updateObjects({
        // TODO: fix the type issue
        // @ts-ignore
        objects: folderOrFileToAdd,
      });
    } else {
      throw new Error('No folders or files to refresh');
    }

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof DropboxResponseError) {
      const { status, error: errorResp } = error;
      const { error: errorTag } = errorResp;

      if (status === 409 && ['not_found'].includes(errorTag?.path?.['.tag'])) {
        await elba.dataProtection.deleteObjects({
          ids: [sourceObjectId],
        });

        return {
          success: true,
        };
      }
    }

    throw error;
  }
};
