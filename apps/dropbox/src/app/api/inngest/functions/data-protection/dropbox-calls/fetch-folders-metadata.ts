import { files } from 'dropbox/types/dropbox_types';
import { CommonDataFetchHeaders } from '../types';
import { DBXAccess } from '@/repositories/dropbox/clients';

type FetchMultipleFoldersMetadata = CommonDataFetchHeaders & {
  sharedFolders: files.FolderMetadataReference[];
};

export const fetchMultipleFoldersMetadata = async ({
  accessToken,
  sharedFolders,
  isPersonal,
  teamMemberId,
  adminTeamMemberId,
}: FetchMultipleFoldersMetadata) => {
  const dbxAccess = new DBXAccess({
    accessToken,
  });
  const sharedFolderMetadata = new Map<
    string,
    {
      name: string;
      preview_url: string;
    }
  >();

  dbxAccess.setHeaders({
    ...(isPersonal ? { selectUser: teamMemberId } : { selectAdmin: adminTeamMemberId }),
  });

  const metadataResult = await Promise.all(
    sharedFolders.map(
      async ({ id: folderId, shared_folder_id: shareFolderId }: files.FolderMetadataReference) => {
        const {
          result: { name, preview_url },
        } = await dbxAccess.sharingGetFolderMetadata({
          actions: [],
          shared_folder_id: shareFolderId!,
        });

        return {
          folder_id: folderId,
          name,
          preview_url,
        };
      }
    )
  );

  if (!metadataResult) {
    throw new Error('No metadata found');
  }

  for (const { folder_id, ...rest } of metadataResult) {
    sharedFolderMetadata.set(folder_id, rest);
  }

  return sharedFolderMetadata;
};
