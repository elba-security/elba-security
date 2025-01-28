import { expect, test, describe, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteThirdPartyAppsObject } from './service';

const userId = 'team-member-id-1';
const appId = 'app-id-1';
const nangoConnectionId = 'nango-connection-id';

describe('deleteThirdPartyAppsObject', () => {
  test('should send request to delete third party objects', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteThirdPartyAppsObject({
      userId,
      appId,
      nangoConnectionId,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'dropbox/third_party_apps.delete_object.requested',
      data: {
        userId,
        appId,
        nangoConnectionId,
      },
    });
  });
});
