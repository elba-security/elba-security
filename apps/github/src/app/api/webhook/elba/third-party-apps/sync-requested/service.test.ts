import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import * as client from '@/inngest/client';
import { handleThirdPartyAppsSyncRequested } from './service';

const organisationId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';

const now = Date.now();

describe('handleElbaOrganisationActivated', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should schedule apps sync', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });

    await expect(handleThirdPartyAppsSyncRequested(organisationId)).resolves.toBeUndefined();
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'github/third_party_apps.sync.requested',
      data: {
        organisationId,
        syncStartedAt: Date.now(),
        isFirstSync: true,
        cursor: null,
      },
    });
  });
});
