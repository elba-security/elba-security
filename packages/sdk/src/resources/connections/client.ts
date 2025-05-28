import type { DeleteConnectionsObjects, UpdateConnectionsObjects } from '@elba-security/schemas';
import { ElbaResourceClient } from '../elba-resource-client';

export class ConnectionsClient extends ElbaResourceClient {
  async updateObjects(data: UpdateConnectionsObjects) {
    const response = await this.requestSender.request('connections/objects', {
      method: 'POST',
      data,
    });
    return response.json<never>();
  }

  async deleteObjects(data: DeleteConnectionsObjects) {
    const response = await this.requestSender.request('connections/objects', {
      method: 'DELETE',
      data,
    });
    return response.json<never>();
  }
}
