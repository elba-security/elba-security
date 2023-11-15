import { ElbaResourceClient } from '../elba-resource-client';
import type {
  ThirdPartyAppsDeleteObjectsResult,
  ThirdPartyAppsObject,
  ThirdPartyAppsUpdateObjectsResult,
} from './types';

export class ThirdPartyAppsClient extends ElbaResourceClient {
  async updateObjects(apps: ThirdPartyAppsObject[]) {
    const response = await this.requestSender.request('third-party-apps/objects', {
      method: 'POST',
      data: { apps },
    });
    return response.json<ThirdPartyAppsUpdateObjectsResult>();
  }

  async deleteObjects({
    syncedBefore,
    ids,
  }: {
    syncedBefore?: Date;
    ids?: { userId: string; appId: string }[];
  }) {
    const response = await this.requestSender.request('third-party-apps/objects', {
      method: 'DELETE',
      data: {
        syncedBefore,
        ids,
      },
    });
    return response.json<ThirdPartyAppsDeleteObjectsResult>();
  }
}
