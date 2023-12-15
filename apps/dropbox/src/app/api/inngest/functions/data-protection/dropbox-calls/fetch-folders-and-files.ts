import { DBXAccess } from '@/repositories/dropbox/clients';

const DROPBOX_LIST_FOLDER_BATCH_SIZE = 500;

type FetchFoldersAndFiles = {
  accessToken: string;
  adminTeamMemberId: string;
  teamMemberId: string;
  path: string;
  isPersonal: boolean;
  pathRoot: number;
  level: number;
  cursor?: string;
};

export const fetchFoldersAndFiles = async ({
  accessToken,
  adminTeamMemberId,
  teamMemberId,
  path,
  isPersonal,
  pathRoot,
  level,
  cursor,
}: FetchFoldersAndFiles) => {
  const dbxAccess = new DBXAccess({
    accessToken,
  });

  const isAdmin = adminTeamMemberId === teamMemberId;

  dbxAccess.setHeaders({
    selectUser: teamMemberId,
    ...(isAdmin ? { pathRoot: JSON.stringify({ '.tag': 'root', root: pathRoot }) } : {}),
  });

  if (cursor) {
    return await dbxAccess.filesListFolderContinue({
      cursor,
    });
  }

  return await dbxAccess.filesListFolder({
    path,
    include_deleted: false,
    include_has_explicit_shared_members: true,
    include_media_info: true,
    include_mounted_folders: true,
    include_non_downloadable_files: true,
    recursive: true,
    limit: DROPBOX_LIST_FOLDER_BATCH_SIZE,
  });
};
