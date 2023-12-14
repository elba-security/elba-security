import { files } from 'dropbox/types/dropbox_types';
import { CommonDataFetchHeaders } from '../types';
import { DBXAccess } from '@/repositories/dropbox/clients';

type FetchMultipleFilesMetadata = CommonDataFetchHeaders & {
  files: files.FileMetadataReference[];
};

export const fetchMultipleFilesMetadata = async ({
  accessToken,
  files,
  isPersonal,
  teamMemberId,
  adminTeamMemberId,
}: FetchMultipleFilesMetadata) => {
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
    files.map(async ({ id: fileId }: files.FileMetadataReference) => {
      const {
        result: { name, preview_url },
      } = await dbxAccess.sharingGetFileMetadata({
        actions: [],
        file: fileId,
      });

      return {
        file_id: fileId,
        name,
        preview_url,
      };
    })
  );

  if (!metadataResult) {
    throw new Error('No metadata found for files');
  }

  for (const { file_id, ...rest } of metadataResult) {
    sharedFolderMetadata.set(file_id, rest);
  }

  return sharedFolderMetadata;
};
