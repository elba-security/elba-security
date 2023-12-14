import { DBXAccess } from '@/repositories/dropbox/clients';
import { CommonDataFetchHeaders, FolderFilePermissions } from '../types';
import { formatPermissions } from '../utils/format-permissions';
import { files } from 'dropbox/types/dropbox_types';

const DROPBOX_LIST_FILE_MEMBERS_LIMIT = 300; // UInt32(min=1, max=300)

type FetchFilesPermissions = CommonDataFetchHeaders & {
  files: files.FileMetadataReference[];
};

export const fetchFilesPermissions = async ({
  accessToken,
  files,
  isPersonal,
  teamMemberId,
  adminTeamMemberId,
}: FetchFilesPermissions) => {
  const dbxAccess = new DBXAccess({
    accessToken,
  });

  dbxAccess.setHeaders({
    ...(isPersonal ? { selectUser: teamMemberId } : { selectAdmin: adminTeamMemberId }),
  });

  const result = await Promise.all(
    files.map(async ({ id: fileId }: files.FileMetadataReference) => {
      const permissions: FolderFilePermissions = {
        id: fileId,
        users: [],
        groups: [],
        invitees: [],
      };

      let nextCursor: string | undefined;
      do {
        const {
          result: { users, groups, invitees, cursor },
        } = nextCursor
          ? await dbxAccess.sharingListFileMembersContinue({ cursor: nextCursor })
          : await dbxAccess.sharingListFileMembers({
              file: fileId,
              include_inherited: true,
              limit: DROPBOX_LIST_FILE_MEMBERS_LIMIT,
            });

        permissions.users.push(...users);
        permissions.groups.push(...groups);
        permissions.invitees.push(...invitees);
        nextCursor = cursor;
      } while (nextCursor);

      return permissions;
    })
  );

  return formatPermissions(result);
};
