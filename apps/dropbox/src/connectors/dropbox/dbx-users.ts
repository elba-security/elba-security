import { DBXAccess } from './dbx-access';
import { formatUsers } from '../utils';

const DROPBOX_BD_USERS_BATCH_SIZE = 1000;

export class DBXUsers extends DBXAccess {
  constructor({ accessToken }: { accessToken: string }) {
    super({
      accessToken,
    });
  }

  fetchUsers = async (cursor?: string) => {
    const {
      result: { members, cursor: nextCursor, has_more: hasMore },
    } = cursor
      ? await this.teamMembersListContinueV2({
          cursor,
        })
      : await this.teamMembersListV2({
          include_removed: false,
          limit: DROPBOX_BD_USERS_BATCH_SIZE,
        });

    return {
      nextCursor,
      hasMore,
      members: formatUsers(members),
    };
  };
}
