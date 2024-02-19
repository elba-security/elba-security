import { expect, test, describe, vi, afterAll, beforeAll } from 'vitest';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import { inngest } from '@/inngest/client';
import { insertOrganisations } from '@/test-utils/token';
import { POST as handler } from './route';

const organisationId = '00000000-0000-0000-0000-000000000001';
const mockDate = '2021-01-01T00:00:00.000Z';

describe('startSync', () => {
  beforeAll(async () => {
    vi.setSystemTime(mockDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should send request to start sync', async () => {
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
      name: 'dropbox/data_protection.shared_link.start.sync_page.requested',
      data: {
        organisationId,
        isFirstSync: true,
        syncStartedAt: 1609459200000,
      },
    });
  });
});
