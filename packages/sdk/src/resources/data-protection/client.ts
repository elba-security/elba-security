import type {
  UpdateDataProtectionObjects,
  DeleteDataProtectionObjects,
} from '@elba-security/schemas';
import { ElbaResourceClient } from '../elba-resource-client';
import type { DataProtectionDeleteObjectsResult, DataProtectionUpdateObjectsResult } from './types';

export class DataProtectionClient extends ElbaResourceClient {
  async updateObjects(data: UpdateDataProtectionObjects) {
    console.log('----------IN THE SDK--------updateObjects------------------------------');
    console.log(data);
    console.log('------------------------------------------------');
    const response = await this.requestSender.request('data-protection/objects', {
      method: 'POST',
      data,
    });
    return response.json<DataProtectionUpdateObjectsResult>();
  }

  async deleteObjects(data: DeleteDataProtectionObjects) {
    console.log('----------IN THE SDK---------deleteObjects-----------------------------');
    console.log(data);
    console.log('------------------------------------------------');
    const response = await this.requestSender.request('data-protection/objects', {
      method: 'DELETE',
      data,
    });
    return response.json<DataProtectionDeleteObjectsResult>();
  }
}
