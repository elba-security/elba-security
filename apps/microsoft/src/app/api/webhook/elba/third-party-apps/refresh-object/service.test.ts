import { expect, test, describe, vi } from 'vitest';
import * as client from '@/inngest/client';
import { refreshThirdPartyAppsObject } from './service';

const organisationId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';
const appId = 'some-app-id';
const userId = 'some-user-id';

describe('refreshThirdPartyAppsObject', () => {
  test('should send a delete app permission event when metadata is valid', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(
      refreshThirdPartyAppsObject({ organisationId, appId, userId })
    ).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'microsoft/third_party_apps.refresh_app_permission.requested',
      data: {
        organisationId,
        appId,
        userId,
      },
    });
  });
});
