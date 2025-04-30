import { getFilesMetadataMembersAndMapDetails } from '@/connectors/dropbox/files';
import { getFoldersMetadataMembersAndMapDetails } from '@/connectors/dropbox/folders';
import { getFolderOrFileMetadataByPath } from '@/connectors/dropbox/folders-and-files';
import { getSharedLinksByPath } from '@/connectors/dropbox/shared-links';
import { getAuthenticatedAdmin, getCurrentUserAccount } from '@/connectors/dropbox/users';
import { nangoAPIClient } from '@/common/nango';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
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
    cancelOn: [
      {
        event: 'dropbox/sync.cancel',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'dropbox/data_protection.refresh_object.requested' },

  async ({ event }) => {
    const {
      id: sourceObjectId,
      organisationId,
      metadata: { ownerId, type, isPersonal },
      nangoConnectionId,
      region,
    } = event.data;

    const isFile = type === 'file';
    const path = isFile ? sourceObjectId : `ns:${sourceObjectId}`;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');
    const { teamMemberId: adminTeamMemberId } = await getAuthenticatedAdmin(
      credentials.access_token
    );
    const { rootNamespaceId: pathRoot } = await getCurrentUserAccount({
      accessToken: credentials.access_token,
      teamMemberId: adminTeamMemberId,
    });

    const elba = createElbaOrganisationClient({ organisationId, region });

    const fileMetadata = await getFolderOrFileMetadataByPath({
      accessToken: credentials.access_token,
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
      accessToken: credentials.access_token,
      teamMemberId: ownerId,
      pathRoot,
      isPersonal,
      path,
    });

    const entityDetails = {
      accessToken: credentials.access_token,
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
