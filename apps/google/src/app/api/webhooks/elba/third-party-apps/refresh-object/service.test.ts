import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { refreshThirdPartyAppsObject } from './service';

describe('refresh-third-party-apps-object', () => {
  it('Should successfully request third party apps object refresh', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await refreshThirdPartyAppsObject({
      organisationId: 'organisation-id',
      appId: 'app-id',
      userId: 'user-id',
    });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      data: {
        appId: 'app-id',
        organisationId: 'organisation-id',
        userId: 'user-id',
      },
      name: 'google/third_party_apps.refresh_object.requested',
    });
  });
});
