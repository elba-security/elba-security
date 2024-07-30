import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import * as client from '@/inngest/client';
import { startThirdPartyAppsSync } from './service';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  tenantId: 'some-tenant-id',
  token: 'some-token',
  region: 'us',
};

const now = Date.now();

describe('startThirdPartyAppsSync', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });
  test('should schedule apps sync', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(
      startThirdPartyAppsSync({ organisationId: organisation.id })
    ).resolves.toBeUndefined();
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'microsoft/third_party_apps.sync.requested',
      data: {
        organisationId: organisation.id,
        syncStartedAt: Date.now(),
        isFirstSync: true,
        skipToken: null,
      },
    });
  });
});
