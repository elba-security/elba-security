import { getFilesMetadataMembersAndMapDetails } from '@/connectors/dropbox/files';
import { getFoldersMetadataMembersAndMapDetails } from '@/connectors/dropbox/folders';
import { type Folder, type File, getFoldersAndFiles } from '@/connectors/dropbox/folders-and-files';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { getSharedLinks } from '@/database/shared-links';
import { inngest } from '@/inngest/client';
import { nangoAPIClient } from '@/common/nango';
import { getAuthenticatedAdmin, getCurrentUserAccount } from '@/connectors/dropbox/users';

export const syncFoldersAndFiles = inngest.createFunction(
  {
    id: 'dropbox-sync-folders-and-files',
    retries: 5,
    concurrency: {
      limit: 1,
      key: 'event.data.isFirstSync',
    },
    onFailure: async ({ step, event }) => {
      await step.sendEvent(`sync-folder-and-files-sync-failed`, {
        name: 'dropbox/data_protection.folder_and_files.sync.completed',
        data: {
          teamMemberId: event.data.event.data.teamMemberId,
          organisationId: event.data.event.data.organisationId,
        },
      });
    },
    cancelOn: [
      {
        event: 'dropbox/sync.cancel',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'dropbox/data_protection.folder_and_files.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, teamMemberId, cursor, nangoConnectionId, region } = event.data;

    const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
    if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
      throw new Error('Could not retrieve Nango credentials');
    }
    const { teamMemberId: adminTeamMemberId } = await getAuthenticatedAdmin(
      credentials.access_token
    );

    const { rootNamespaceId: pathRoot } = await getCurrentUserAccount({
      accessToken: credentials.access_token,
      teamMemberId: adminTeamMemberId,
    });

    const accessToken = credentials.access_token;

    const { foldersAndFiles, nextCursor } = await step.run('fetch-folders-and-files', async () => {
      return await getFoldersAndFiles({
        accessToken,
        teamMemberId,
        pathRoot,
        isAdmin: teamMemberId === adminTeamMemberId,
        cursor,
      });
    });

    const sharedLinks = await getSharedLinks({
      organisationId,
      linkIds: foldersAndFiles.map((item) =>
        item['.tag'] === 'folder' ? `ns:${item.shared_folder_id}` : item.id
      ),
    });

    const hasSharedLinks = (fileId: string) => sharedLinks.find((link) => link.id === fileId);

    const { folders, files } = foldersAndFiles.reduce<{
      folders: Folder[];
      files: File[];
    }>(
      (acc, entry) => {
        // Ignore folders that are not shared
        if (entry['.tag'] === 'folder' && entry.sharing_info?.shared_folder_id) {
          acc.folders.push(entry);
        }

        // Ignore files that are not shared
        if (
          entry['.tag'] === 'file' &&
          (entry.has_explicit_shared_members || hasSharedLinks(entry.id))
        ) {
          acc.files.push(entry);
        }

        return acc;
      },
      {
        folders: [],
        files: [],
      }
    );

    const filesToAdd = await step.run('fetch-folders-and-map-details', async () => {
      return getFilesMetadataMembersAndMapDetails({
        accessToken,
        teamMemberId,
        files,
        sharedLinks,
      });
    });

    const foldersToAdd = await step.run('fetch-folders-and-map-details', async () => {
      return getFoldersMetadataMembersAndMapDetails({
        accessToken,
        teamMemberId,
        folders,
        sharedLinks,
      });
    });

    const elba = createElbaOrganisationClient({ organisationId, region });

    const entries = [...foldersToAdd, ...filesToAdd];

    if (entries.length > 0) {
      await step.run('send-data-protection-to-elba', async () => {
        await elba.dataProtection.updateObjects({
          objects: entries,
        });
      });
    }

    if (nextCursor) {
      await step.sendEvent('synchronize-folders-and-files-requested', {
        name: 'dropbox/data_protection.folder_and_files.sync.requested',
        data: { ...event.data, cursor: nextCursor },
      });
      return { status: 'ongoing' };
    }

    await step.sendEvent(`sync-folder-and-files-sync-${teamMemberId}`, {
      name: 'dropbox/data_protection.folder_and_files.sync.completed',
      data: {
        teamMemberId,
        organisationId,
      },
    });
  }
);
