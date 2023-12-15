import { formatSharedLinksPermission } from '../utils/format-permissions';
import { fetchMultipleFilesMetadata } from './fetch-files-metadata';
import { fetchFilesPermissions } from './fetch-files-permissions';
import { fetchMultipleFoldersPermissions } from './fetch-folder-permissions';
import { fetchMultipleFoldersMetadata } from './fetch-folders-metadata';

type FetchAndMapData = {
  commonProps: {
    accessToken: string;
    adminTeamMemberId: string;
    teamMemberId: string;
  };
  foldersAndFiles: any[];
  allSharedLinks: any[];
};
export const fetchAndMapData = async ({ commonProps, foldersAndFiles, allSharedLinks }) => {
  const sharedFolders = foldersAndFiles.filter(
    (entry) => entry['.tag'] === 'folder' && entry.shared_folder_id
  );

  const files = foldersAndFiles.filter((entry) => entry['.tag'] === 'file');

  const [foldersPermissions, foldersMetadata, filesPermissions, filesMetadata] = await Promise.all([
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
};
