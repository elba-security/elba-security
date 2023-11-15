import { ElbaResourceClient } from '../elba-resource-client';
import type { AuthenticationUpdateObjectsResult, AuthenticationObject } from './types';

export class AuthenticationClient extends ElbaResourceClient {
  async updateObjects(objects: AuthenticationObject[]) {
    const response = await this.requestSender.request('authentication/objects', {
      method: 'POST',
      data: { objects },
    });
    return response.json<AuthenticationUpdateObjectsResult>();
  }
}
