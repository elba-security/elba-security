import type { UpdateUsers, DeleteUsers } from '@elba-security/schemas';
import { ElbaResourceClient } from '../elba-resource-client';
import type { UserDeleteResult, UserUpdateResult } from './types';

export class UsersClient extends ElbaResourceClient {
  async update(data: UpdateUsers) {
    const response = await this.requestSender.request('users', {
      method: 'POST',
      data,
    });
    return response.json<UserUpdateResult>();
  }

  async delete(data: DeleteUsers) {
    const response = await this.requestSender.request('users', {
      method: 'DELETE',
      data,
    });
    return response.json<UserDeleteResult>();
  }
}
