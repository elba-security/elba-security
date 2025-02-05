import type { UpdateConnectionStatusData } from '@elba-security/schemas';
import { ElbaResourceClient } from '../elba-resource-client';
import type { ConnectionStatusUpdateResult } from './types';

export class ConnectionStatusClient extends ElbaResourceClient {
  async update(data: UpdateConnectionStatusData) {
    const response = await this.requestSender.request('connection-status', {
      method: 'POST',
      data,
    });
    return response.json<ConnectionStatusUpdateResult>();
  }
}
