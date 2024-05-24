import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { startThirdPartyAppsSync } from './service';

const mockedDate = '2023-01-01T00:00:00.000Z';

describe('start-third-party-apps-sync', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('Should successfully request third party apps sync', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    await startThirdPartyAppsSync('organisation-id');
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      data: {
        isFirstSync: true,
        organisationId: 'organisation-id',
        pageToken: null,
        syncStartedAt: '2023-01-01T00:00:00.000Z',
      },
      name: 'google/third_party_apps.sync.requested',
    });
  });
});
