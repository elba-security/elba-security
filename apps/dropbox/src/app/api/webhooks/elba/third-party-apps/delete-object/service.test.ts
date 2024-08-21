import { expect, test, describe, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteThirdPartyAppsObject } from './service';

const organisationId = '00000000-0000-0000-0000-000000000001';
const userId = 'team-member-id-1';
const appId = 'app-id-1';

describe('deleteThirdPartyAppsObject', () => {
  test('should send request to delete third party objects', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteThirdPartyAppsObject({
      organisationId,
      userId,
      appId,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'dropbox/third_party_apps.delete_object.requested',
      data: {
        organisationId,
        userId,
        appId,
      },
    });
  });
});
