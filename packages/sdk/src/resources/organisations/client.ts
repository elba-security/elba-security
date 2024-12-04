import { ElbaResourceClient } from '../elba-resource-client';
import { type OrganisationsGetResult } from './types';

export class OrganisationsClient extends ElbaResourceClient {
  async list() {
    const response = await this.requestSender.request('organisations', { method: 'GET' });
    return response.json<OrganisationsGetResult>();
  }
}
