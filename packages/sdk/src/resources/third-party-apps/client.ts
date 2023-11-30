import type { UpdateThirdPartyApps, DeleteThirdPartyApps } from '@elba-security/schemas';
import { ElbaResourceClient } from '../elba-resource-client';
import type { ThirdPartyAppsDeleteObjectsResult, ThirdPartyAppsUpdateObjectsResult } from './types';

export class ThirdPartyAppsClient extends ElbaResourceClient {
  async updateObjects(data: UpdateThirdPartyApps) {
    const response = await this.requestSender.request('third-party-apps/objects', {
      method: 'POST',
      data,
    });
    return response.json<ThirdPartyAppsUpdateObjectsResult>();
  }

  async deleteObjects(data: DeleteThirdPartyApps) {
    const response = await this.requestSender.request('third-party-apps/objects', {
      method: 'DELETE',
      data,
    });
    return response.json<ThirdPartyAppsDeleteObjectsResult>();
  }
}
