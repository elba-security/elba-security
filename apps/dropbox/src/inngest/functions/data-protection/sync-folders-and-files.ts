import { getSharedLinks } from './data';
import { getOrganisationAccessDetails } from '../common/data';
import { DBXFiles, getElba } from '@/connectors';
import { FunctionHandler, inngest } from '@/inngest/client';
import { InputArgWithTrigger } from '@/inngest/types';
import { decrypt } from '@/common/crypto';
import { NonRetriableError } from 'inngest';

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

  const elba = getElba({
    organisationId,
    region,
  });

  const result = await step.run('fetch-folders-and-files', async () => {
    return dbx.fetchFoldersAndFiles(cursor);
  });

  if (result.hasMore) {
    await step.sendEvent('synchronize-folders-and-files', {
      name: 'dropbox/data_protection.folder_and_files.sync_page.requested',
      data: { ...event.data, cursor: result.nextCursor },
    });
  }

  const fileIds = result.foldersAndFiles.reduce((acc: string[], file) => {
    if (!file.id) {
      return acc;
    }

    if (file['.tag'] === 'folder') {
      acc.push(`ns:${file.shared_folder_id}`);
      return acc;
    }

    acc.push(file.id);
    return acc;
  }, []);

  const sharedLinks = await getSharedLinks({
    organisationId,
    linkIds: fileIds,
  });

  const foldersAndFilesToAdd = await step.run(
    'fetch-metadata-members-and-map-details',
    async () => {
      return dbx.fetchMetadataMembersAndMapDetails({
        foldersAndFiles: result.foldersAndFiles,
        sharedLinks,
      });
    }
  );

  if (foldersAndFilesToAdd.length > 0) {
    await step.run('send-data-protection-to-elba', async () => {
      await elba.dataProtection.updateObjects({
        objects: foldersAndFilesToAdd,
      });
    });
  }
};

export const synchronizeFoldersAndFiles = inngest.createFunction(
  {
    id: 'dropbox-synchronize-folders-and-files',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 10,
    concurrency: {
      limit: 5,
      key: 'event.data.organisationId',
    },
  },
  { event: 'dropbox/data_protection.folder_and_files.sync_page.requested' },
  handler
);
