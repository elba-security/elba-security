import { ElbaResourceClient } from '../elba-resource-client';
import type { ConnectionStatusUpdateResult } from './types';

export class ConnectionStatusClient extends ElbaResourceClient {
  async update(hasError: boolean) {
    const response = await this.requestSender.request('connection-status', {
      method: 'POST',
      data: { hasError },
    });
    return response.json<ConnectionStatusUpdateResult>();
  }
}
