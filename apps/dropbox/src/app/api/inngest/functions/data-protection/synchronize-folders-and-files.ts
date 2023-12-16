import { inngest } from '@/common/clients/inngest';
import { getSharedLinks } from './data';
import { handleError } from '../../handle-error';
import { fetchFoldersAndFiles } from './dropbox-calls/fetch-folders-and-files';
import { fetchMultipleFoldersPermissions } from './dropbox-calls/fetch-folder-permissions';
import { fetchMultipleFoldersMetadata } from './dropbox-calls/fetch-folders-metadata';
import { fetchFilesPermissions } from './dropbox-calls/fetch-files-permissions';
import { fetchMultipleFilesMetadata } from './dropbox-calls/fetch-files-metadata';
import { formatSharedLinksPermission } from './utils/format-permissions';
import { formatFilesToAdd } from './utils/format-files-and-folders';
import { elbaAccess } from '@/common/clients/elba';
import { DbxFetcher } from '@/repositories/dropbox/clients/DBXFetcher';

const handler: Parameters<typeof inngest.createFunction>[2] = async ({ event, step }) => {
  if (!event.ts) {
    throw new Error('Missing event.ts');
  }

  const {
    organisationId,
    accessToken,
    isPersonal,
    teamMemberId,
    adminTeamMemberId,
    pathRoot,
    cursor,
  } = event.data;
  const dbxFetcher = new DbxFetcher({
    accessToken,
    adminTeamMemberId,
    teamMemberId,
    pathRoot,
  });
  const elba = elbaAccess(organisationId);

  const response = await step
    .run('fetch-folders-and-files', async () => {
      return dbxFetcher.fetchFoldersAndFiles(cursor);
    })
    .catch(handleError);

  const {
    result: { entries: foldersAndFiles, has_more: hasMore, cursor: nextCursor },
  } = response;

  if (hasMore) {
    await step.sendEvent('send-event-synchronize-folders-and-files', {
      name: 'data-protection/synchronize-folders-and-files',
      data: { ...event.data, cursor: nextCursor },
    });
  }

  const pathLowers = foldersAndFiles.reduce((acc: string[], file) => {
    if (!file?.path_lower) {
      return acc;
    }
    acc.push(file.path_lower);
    return acc;
  }, []);

  const sharedLinks = await step.run('get-file-shared-links', async () => {
    return getSharedLinks({
      organisationId,
      pathLowers,
    });
  });

  const foldersAndFilesToAdd = await step
    .run('fetch-metadata-members-and-map-details', async () => {
      return dbxFetcher.fetchMetadataMembersAndMapDetails({
        foldersAndFiles,
        sharedLinks,
      });
    })
    .catch(handleError);

  await step.run('format-files-and-folders-to-add', async () => {
    return await elba.dataProtection.updateObjects({
      objects: foldersAndFilesToAdd,
    });
  });

  return {
    success: true,
  };
};

export const synchronizeFoldersAndFiles = inngest.createFunction(
  {
    id: 'synchronize-folders-and-files',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    // rateLimit: {
    //   limit: 1,
    //   key: 'event.data.organisationId',
    //   period: '1s',
    // },
    retries: 10,
    concurrency: {
      limit: 10,
      key: 'event.data.organisationId',
    },
  },
  { event: 'data-protection/synchronize-folders-and-files' },
  handler
);
