import type {
  PostConfigurationObjectsRequestBody,
  PostConfigurationObjectsSearchParams,
  PostConfigurationObjectsResponse,
  DeleteConfigurationObjectsRequestBody,
  DeleteConfigurationObjectsResponse,
} from '@elba-security/schemas';
import { ElbaResourceClient } from '../elba-resource-client';

export class ConfigurationsClient extends ElbaResourceClient {
  /**
   * Update configurations in Elba.
   * Configurations are created or updated based on unique identification
   * by organisation + source + category + sub_category.
   *
   * @param data - The configuration data to update
   * @param searchParams - Optional search parameters (syncedBefore)
   * @returns Response with counts of created, updated, and deleted configurations
   */
  async update(
    data: PostConfigurationObjectsRequestBody,
    searchParams?: PostConfigurationObjectsSearchParams
  ) {
    const queryParams = searchParams?.syncedBefore
      ? `?syncedBefore=${searchParams.syncedBefore}`
      : '';

    const response = await this.requestSender.request(`configurations/objects${queryParams}`, {
      method: 'POST',
      data,
    });

    return response.json<PostConfigurationObjectsResponse>();
  }

  /**
   * Delete configurations from Elba.
   * Can delete by specific IDs or by sync timestamp.
   *
   * @param data - Either an array of IDs or a syncedBefore timestamp
   * @returns Response indicating success
   */
  async delete(data: DeleteConfigurationObjectsRequestBody) {
    const response = await this.requestSender.request('configurations/objects', {
      method: 'DELETE',
      data,
    });

    return response.json<DeleteConfigurationObjectsResponse>();
  }
}
