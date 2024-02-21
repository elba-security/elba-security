import { expect, test, describe, vi, afterEach } from 'vitest';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import { POST as handler } from './route';
import { inngest } from '@/inngest/client';
import { insertOrganisations } from '@/test-utils/token';

const organisationId = '00000000-0000-0000-0000-000000000001';
const syncStartAt = '2021-01-01T00:00:00.000Z';

describe('triggerThirdPartyAppsScan', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should schedule trigger the dropbox/third_party_apps.sync_page.requested event', async () => {
    vi.setSystemTime(syncStartAt);
    await insertOrganisations();
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockNextRequest({
      handler,
      body: {
        organisationId,
      },
    });

    expect(response.status).toBe(200);

    expect(send).toBeCalledTimes(1);

    expect(send).toBeCalledWith({
      name: 'dropbox/third_party_apps.sync_page.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: 1609459200000,
      },
    });
  });
});
