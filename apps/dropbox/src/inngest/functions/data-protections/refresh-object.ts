import { decrypt } from '@/common/crypto';
import { getFilesMetadataMembersAndMapDetails } from '@/connectors/dropbox/files';
import { getFoldersMetadataMembersAndMapDetails } from '@/connectors/dropbox/folders';
import { getFolderOrFileMetadataByPath } from '@/connectors/dropbox/folders-and-files';
import { getSharedLinksByPath } from '@/connectors/dropbox/shared-links';
import { createElbaClient } from '@/connectors/elba/client';
import { getOrganisation } from '@/database/organisations';
import { inngest } from '@/inngest/client';

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

  async ({ event }) => {
    const {
      id: sourceObjectId,
      organisationId,
      metadata: { ownerId, type, isPersonal },
    } = event.data;

    const isFile = type === 'file';
    const path = isFile ? sourceObjectId : `ns:${sourceObjectId}`;

    const { accessToken, pathRoot, region } = await getOrganisation(organisationId);

    const decryptedAccessToken = await decrypt(accessToken);

    const elba = createElbaClient({ organisationId, region });

    const fileMetadata = await getFolderOrFileMetadataByPath({
      accessToken: decryptedAccessToken,
      teamMemberId: ownerId,
      pathRoot,
      isAdmin: !isPersonal,
      path,
    });

    if ('error' in fileMetadata || !fileMetadata.path_lower) {
      await elba.dataProtection.deleteObjects({
        ids: [sourceObjectId],
      });
      return;
    }

    const sharedLinks = await getSharedLinksByPath({
      accessToken: decryptedAccessToken,
      teamMemberId: ownerId,
      pathRoot,
      isPersonal,
      path,
    });

    const entityDetails = {
      accessToken: decryptedAccessToken,
      teamMemberId: ownerId,
      sharedLinks,
    };

    const folderOrFileToAdd =
      fileMetadata['.tag'] === 'folder'
        ? await getFoldersMetadataMembersAndMapDetails({
            ...entityDetails,
            folders: [fileMetadata],
          })
        : await getFilesMetadataMembersAndMapDetails({
            ...entityDetails,
            files: [fileMetadata],
          });

    await elba.dataProtection.updateObjects({
      objects: folderOrFileToAdd,
    });
  }
);
