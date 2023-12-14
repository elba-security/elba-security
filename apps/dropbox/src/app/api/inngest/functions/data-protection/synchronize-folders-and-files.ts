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

const handler: Parameters<typeof inngest.createFunction>[2] = async ({ event, step }) => {
  if (!event.ts) {
    throw new Error('Missing event.ts');
  }

  const { organisationId, accessToken, isPersonal, teamMemberId, adminTeamMemberId } = event.data;

  const response = await step
    .run('fetch-folders-and-files', async () => {
      return fetchFoldersAndFiles(event.data);
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

  const allSharedLinks = await step.run('get-file-shared-links', async () => {
    return getSharedLinks({
      organisationId,
      pathLowers,
    });
  });

  const commonProps = {
    accessToken,
    isPersonal,
    teamMemberId,
    adminTeamMemberId,
  };

  const sharedFolders = foldersAndFiles.filter(
    (entry) => entry['.tag'] === 'folder' && entry.shared_folder_id
  );

  const files = foldersAndFiles.filter((entry) => entry['.tag'] === 'file');

  const formattedFoldersAndFiles = await step
    .run('fetch-metadata-members-and-map-details', async () => {
      const [foldersPermissions, foldersMetadata, filesPermissions, filesMetadata] =
        await Promise.all([
          fetchMultipleFoldersPermissions({
            ...commonProps,
            sharedFolders,
          }),
          fetchMultipleFoldersMetadata({
            ...commonProps,
            sharedFolders,
          }),
          fetchFilesPermissions({
            ...commonProps,
            files,
          }),
          fetchMultipleFilesMetadata({
            ...commonProps,
            files,
          }),
        ]);

      const filteredPermissions = new Map([...foldersPermissions, ...filesPermissions]);
      const filteredMetadata = new Map([...foldersMetadata, ...filesMetadata]);

      const mappedResult = [...sharedFolders, ...files].map((entry) => {
        const permissions = filteredPermissions.get(entry.id);
        const metadata = filteredMetadata.get(entry.id);

        const fileSharedLinks = formatSharedLinksPermission(
          allSharedLinks.filter(({ pathLower }) => pathLower === entry.path_lower)
        );

        if (metadata && permissions) {
          return {
            ...entry,
            metadata,
            permissions: [...permissions, ...fileSharedLinks],
          };
        }

        // Permissions and metadata should have been assigned, if not throw error
        throw new Error('Permissions or metadata not found');
      });

      return mappedResult;
    })
    .catch(handleError);

  // await step.run('inngest-console-log-synchronize-folders-and-files', async () => {
  //   console.log('----------synchronize-folders-and-files---------');
  //   // console.log('receivedFoldersAndFilesPaths', pathLowers);
  //   // console.log('fileSharedLinks', fileSharedLinks);
  //   console.log('formattedFoldersAndFiles', JSON.stringify(formattedFoldersAndFiles, null, 2));
  //   console.log('------------------------------------------------');
  // });

  await step.run('format-files-and-folders-to-add', async () => {
    // console.log('---------------BEFORE FORMATE-------------------');
    // console.log(JSON.stringify(formattedFoldersAndFiles, null, 2));
    // console.log('------------------------------------------------');
    const foldersAndFilesToAdd = formatFilesToAdd({
      ...commonProps,
      files: formattedFoldersAndFiles,
    });

    console.log('--------FINAL FOLDER & FILES TO ADD------------');
    console.log(JSON.stringify(foldersAndFilesToAdd, null, 2));
    console.log('------------------------------------------------');
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
