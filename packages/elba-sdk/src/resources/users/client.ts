import { ElbaResourceClient } from '../elba-resource-client';
import type { User, UserDeleteResult, UserUpdateResult } from './types';

export class UsersClient extends ElbaResourceClient {
  async update(users: User[]) {
    const response = await this.requestSender.request('users', {
      method: 'POST',
      data: { users },
    });
    return response.json<UserUpdateResult>();
  }

  async delete({ syncedBefore, ids }: { syncedBefore?: Date; ids?: string[] }) {
    const response = await this.requestSender.request('users', {
      method: 'DELETE',
      data: { lastSyncedBefore: syncedBefore, ids },
    });
    return response.json<UserDeleteResult>();
  }
}
