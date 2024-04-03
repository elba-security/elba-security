import { NonRetriableError } from 'inngest';
import type { files as DbxFiles } from 'dropbox/types/dropbox_types';
import { DBXFiles, getElba } from '@/connectors';
import type { FunctionHandler } from '@/inngest/client';
import { inngest } from '@/inngest/client';
import type { InputArgWithTrigger } from '@/inngest/types';
import { decrypt } from '@/common/crypto';
import type { FileSelectedTypes } from '@/connectors/types';
import { getOrganisationAccessDetails } from '../common/data';
import { getSharedLinks } from './data';

const handler: FunctionHandler = async ({
  event,
  step,
}: InputArgWithTrigger<'dropbox/data_protection.folder_and_files.sync_page.requested'>) => {
  const { organisationId, teamMemberId, cursor } = event.data;

  const [organisation] = await getOrganisationAccessDetails(organisationId);

  if (!organisation) {
    throw new NonRetriableError(
      `Access token not found for organisation with ID: ${organisationId}`
    );
  }

  const { accessToken, adminTeamMemberId, pathRoot, region } = organisation;

  const token = await decrypt(accessToken);

  const dbx = new DBXFiles({
    accessToken: token,
    adminTeamMemberId,
    teamMemberId,
    pathRoot,
  });

  const result = await step.run('fetch-folders-and-files', async () => {
    return dbx.fetchFoldersAndFiles(cursor);
  });

  const sharedLinks = await getSharedLinks({
    organisationId,
    linkIds: result.foldersAndFiles.map((item) =>
      item['.tag'] === 'folder' ? `ns:${item.shared_folder_id}` : item.id
    ),
  });

  const { folders, files } = result.foldersAndFiles.reduce<{
    folders: DbxFiles.FolderMetadataReference[];
    files: FileSelectedTypes[];
  }>(
    (acc, entry) => {
      if (entry['.tag'] === 'folder' && entry.shared_folder_id) {
        acc.folders.push({
          '.tag': 'folder',
          id: entry.id,
          shared_folder_id: entry.shared_folder_id,
          name: entry.name,
        });
      }

      if (entry['.tag'] === 'file') {
        acc.files.push({
          '.tag': 'file',
          id: entry.id,
          name: entry.name,
          ...(entry.content_hash && { content_hash: entry.content_hash }),
        });
      }

      return acc;
    },
    {
      folders: [],
      files: [],
    }
  );

  const filesToAdd = await step.run('fetch-files-and-map-details', async () => {
    return dbx.fetchFilesMetadataMembersAndMapDetails({
      files,
      sharedLinks,
    });
  });

  const foldersToAdd = await step.run('fetch-folders-and-map-details', async () => {
    return dbx.fetchFoldersMetadataMembersAndMapDetails({
      folders,
      sharedLinks,
    });
  });

  const entries = [...filesToAdd, ...foldersToAdd];

  const elba = getElba({
    organisationId,
    region,
  });

  if (entries.length > 0) {
    await step.run('send-data-protection-to-elba', async () => {
      await elba.dataProtection.updateObjects({
        objects: entries,
      });
    });
  }

  if (result.hasMore) {
    await step.sendEvent('synchronize-folders-and-files-requested', {
      name: 'dropbox/data_protection.folder_and_files.sync_page.requested',
      data: { ...event.data, cursor: result.nextCursor },
    });
    return { status: 'ongoing' };
  }

  await step.sendEvent(`sync-folder-and-files-sync-${teamMemberId}`, {
    name: 'dropbox/data_protection.folder_and_files.sync_page.completed',
    data: {
      teamMemberId,
      organisationId,
    },
  });
};

export const synchronizeFoldersAndFilesEventHandler = inngest.createFunction(
  {
    id: 'dropbox-synchronize-folders-and-files',
    retries: 5,
    concurrency: {
      limit: 1,
      key: 'event.data.isFirstSync',
    },
    onFailure: async ({ step, event }) => {
      await step.sendEvent(`sync-folder-and-files-sync-failed`, {
        name: 'dropbox/data_protection.folder_and_files.sync_page.completed',
        data: {
          teamMemberId: event.data.event.data.teamMemberId,
          organisationId: event.data.event.data.organisationId,
        },
      });
    },
  },
  { event: 'dropbox/data_protection.folder_and_files.sync_page.requested' },
  handler
);
