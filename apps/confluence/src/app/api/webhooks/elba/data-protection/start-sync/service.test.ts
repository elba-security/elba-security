import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { inngest } from '@/inngest/client';
import { startDataProtectionSync } from './service';

const now = Date.now();
const organisationId = 'organisation-id';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

describe('webhook startDataProtectionSync', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should request data protection sync when metadata is valid', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await expect(
      startDataProtectionSync({ organisationId, nangoConnectionId, region })
    ).resolves.toBeUndefined();

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'confluence/data_protection.spaces.sync.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: now,
        type: 'global',
        cursor: null,
        nangoConnectionId,
        region,
      },
    });
  });
});
