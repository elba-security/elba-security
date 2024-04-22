import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { startDataProtectionSync } from './service';

const mockedDate = '2023-01-01T00:00:00.000Z';

describe('start-data-protection-sync', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('Should successfully request data protection sync', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await startDataProtectionSync('organisation-id');
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      data: {
        isFirstSync: true,
        organisationId: 'organisation-id',
        syncStartedAt: '2023-01-01T00:00:00.000Z',
      },
      name: 'google/data_protection.sync.requested',
    });
  });
});
