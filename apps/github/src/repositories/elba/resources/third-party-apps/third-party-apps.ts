import { ElbaResource } from '../elba-resource';
import type { ThirdPartyAppsObject } from './types';

export class ThirdPartyApps extends ElbaResource {
  async updateObjects(objects: ThirdPartyAppsObject[]) {
    const response = await this.requestSender.request('third-party-apps/objects', {
      method: 'POST',
      data: { apps: objects },
    });
    return response.json();
  }

  async deleteObjects(syncedBefore: Date) {
    const response = await this.requestSender.request('third-party-apps/objects', {
      method: 'DELETE',
      data: { syncedBefore },
    });
    return response.json();
  }
}
