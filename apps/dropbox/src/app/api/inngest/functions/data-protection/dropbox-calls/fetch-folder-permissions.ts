import { DBXAccess } from '@/repositories/dropbox/clients';
import { files } from 'dropbox/types/dropbox_types';
import { CommonDataFetchHeaders, FolderFilePermissions } from '../types';
import { formatPermissions } from '../utils/format-permissions';

const DROPBOX_LIST_FOLDER_MEMBERS_LIMIT = 1000;

type FetchFolderPermissions = CommonDataFetchHeaders & {
  sharedFolders: files.FolderMetadataReference[];
};

export const fetchMultipleFoldersPermissions = async ({
  accessToken,
  sharedFolders,
  isPersonal,
  teamMemberId,
  adminTeamMemberId,
}: FetchFolderPermissions) => {
  const dbxAccess = new DBXAccess({
    accessToken,
  });

  dbxAccess.setHeaders({
    ...(isPersonal ? { selectUser: teamMemberId } : { selectAdmin: adminTeamMemberId }),
  });

  const result = await Promise.all(
    sharedFolders.map(
      async ({ id: folderId, shared_folder_id: shareFolderId }: files.FolderMetadataReference) => {
        const permissions: FolderFilePermissions = {
          id: folderId,
          users: [],
          groups: [],
          invitees: [],
        };

        let nextCursor: string | undefined;
        do {
          const {
            result: { users, groups, invitees, cursor },
          } = nextCursor
            ? await dbxAccess.sharingListFolderMembersContinue({ cursor: nextCursor })
            : await dbxAccess.sharingListFolderMembers({
                shared_folder_id: shareFolderId!,
                limit: DROPBOX_LIST_FOLDER_MEMBERS_LIMIT,
              });

          permissions.users.push(...users);
          permissions.groups.push(...groups);
          permissions.invitees.push(...invitees);
          nextCursor = cursor;
        } while (nextCursor);

        return permissions;
      }
    )
  );

  return formatPermissions(result);
};
