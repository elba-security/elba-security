import { ElbaResourceClient } from '../elba-resource-client';
import type {
  DataProtectionDeleteObjectsResult,
  DataProtectionObject,
  DataProtectionUpdateObjectsResult,
} from './types';

export class DataProtectionClient extends ElbaResourceClient {
  async updateObjects(objects: DataProtectionObject[]) {
    const response = await this.requestSender.request('data-protection/objects', {
      method: 'POST',
      data: { objects },
    });
    return response.json<DataProtectionUpdateObjectsResult>();
  }

  async deleteObjects({ syncedBefore, ids }: { syncedBefore?: Date; ids?: string[] }) {
    const response = await this.requestSender.request('data-protection/objects', {
      method: 'DELETE',
      data: { syncedBefore, ids },
    });
    return response.json<DataProtectionDeleteObjectsResult>();
  }
}
