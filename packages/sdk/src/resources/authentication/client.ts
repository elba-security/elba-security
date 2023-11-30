import type { UpdateAuthenticationObjects } from '@elba-security/schemas';
import { ElbaResourceClient } from '../elba-resource-client';
import type { AuthenticationUpdateObjectsResult } from './types';

export class AuthenticationClient extends ElbaResourceClient {
  async updateObjects(data: UpdateAuthenticationObjects) {
    const response = await this.requestSender.request('authentication/objects', {
      method: 'POST',
      data,
    });
    return response.json<AuthenticationUpdateObjectsResult>();
  }
}
