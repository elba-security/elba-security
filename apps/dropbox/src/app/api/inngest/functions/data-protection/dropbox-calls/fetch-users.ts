import { DBXAccess } from '@/repositories/dropbox/clients';
import { DropboxResponse, team } from '@/repositories/dropbox/types';

type FetchUsers = {
  accessToken: string;
  cursor?: string;
};

const DROPBOX_BD_USERS_BATCH_SIZE = 1000;

export const fetchUsers = async ({ accessToken, cursor }: FetchUsers) => {
  let response: DropboxResponse<team.MembersListV2Result>;
  const dbxAccess = new DBXAccess({
    accessToken,
  });

  if (!cursor) {
    response = await dbxAccess.teamMembersListV2({
      include_removed: false,
      limit: DROPBOX_BD_USERS_BATCH_SIZE,
    });
  } else {
    response = await dbxAccess.teamMembersListContinueV2({
      cursor,
    });
  }

  const {
    result: { members, cursor: nextCursor, has_more: hasMore },
  } = response;

  if (!members.length) {
    throw new Error('No members found');
  }

  const activeTeamMembers = members.filter(({ profile: { status } }) => {
    // We only consider active, suspended members
    return ['active', 'suspended'].includes(status['.tag']);
  });

  return {
    nextCursor,
    hasMore,
    members: activeTeamMembers,
  };
};
