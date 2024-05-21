import { describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { deleteThirdPartyAppsObject } from './service';

describe('delete-third-party-apps-object', () => {
  it('Should successfully request third party apps object deletion', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await deleteThirdPartyAppsObject({
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
      name: 'google/third_party_apps.delete_object.requested',
    });
  });
});
