import { decrypt } from '@/common/crypto';
import { getFilesMetadataMembersAndMapDetails } from '@/connectors/dropbox/files';
import { getFoldersMetadataMembersAndMapDetails } from '@/connectors/dropbox/folders';
import { type Folder, type File, getFoldersAndFiles } from '@/connectors/dropbox/folders-and-files';
import { createElbaClient } from '@/connectors/elba/client';
import { getOrganisation } from '@/database/organisations';
import { getSharedLinks } from '@/database/shared-links';
import { inngest } from '@/inngest/client';

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
  },
  { event: 'dropbox/data_protection.folder_and_files.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, teamMemberId, cursor } = event.data;
    const { accessToken, adminTeamMemberId, pathRoot, region } =
      await getOrganisation(organisationId);

    const decryptedToken = await decrypt(accessToken);

    const { foldersAndFiles, nextCursor } = await step.run('fetch-folders-and-files', async () => {
      return await getFoldersAndFiles({
        accessToken: decryptedToken,
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
        accessToken: decryptedToken,
        teamMemberId,
        files,
        sharedLinks,
      });
    });

    const foldersToAdd = await step.run('fetch-folders-and-map-details', async () => {
      return getFoldersMetadataMembersAndMapDetails({
        accessToken: decryptedToken,
        teamMemberId,
        folders,
        sharedLinks,
      });
    });

    const elba = createElbaClient({ organisationId, region });

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
