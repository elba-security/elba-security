import { ElbaResource } from '../elba-resource';
import type { User } from './types';

export class Users extends ElbaResource {
  async updateUsers(users: User[]) {
    const response = await this.requestSender.request('users', {
      method: 'POST',
      data: { users },
    });
    return response.json();
  }

  async deleteUsers(lastSyncedBefore: Date) {
    const response = await this.requestSender.request('users', {
      method: 'DELETE',
      data: { lastSyncedBefore },
    });
    return response.json();
  }
}
