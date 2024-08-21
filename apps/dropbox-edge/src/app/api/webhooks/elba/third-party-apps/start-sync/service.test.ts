import { expect, test, describe, vi, afterEach } from 'vitest';
import { inngest } from '@/inngest/client';
import { startThirdPartySync } from './service';

const organisationId = '00000000-0000-0000-0000-000000000001';
const syncStartAt = '2021-01-01T00:00:00.000Z';

describe('triggerThirdPartyAppsScan', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should schedule trigger the dropbox/third_party_apps.sync.requested event', async () => {
    vi.setSystemTime(syncStartAt);
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await startThirdPartySync(organisationId);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'dropbox/third_party_apps.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: 1609459200000,
        cursor: null,
      },
    });
  });
});
