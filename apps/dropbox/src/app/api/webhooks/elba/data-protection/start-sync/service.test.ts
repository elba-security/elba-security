import { expect, test, describe, vi, afterAll, beforeAll } from 'vitest';
import { inngest } from '@/inngest/client';
import { startDataProtectionSync } from './service';

const organisationId = '00000000-0000-0000-0000-000000000001';
const now = Date.now();
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

describe('startDataProtectionSync', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should send request to start sync', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await startDataProtectionSync({ organisationId, nangoConnectionId, region });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'dropbox/data_protection.shared_links.start.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: now,
        cursor: null,
        nangoConnectionId,
        region,
      },
    });
  });
});
