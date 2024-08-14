import { expect, test, describe, vi, afterAll, beforeEach } from 'vitest';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import { inngest } from '@/inngest/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { POST as handler } from './route';

const token = 'test-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};

const date = Date.now();

describe('startSync', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
    vi.setSystemTime(date);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should send request to start sync', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockNextRequest({
      handler,
      body: {
        organisationId: organisation.id,
      },
    });

    expect(response.status).toBe(200);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'sharepoint/data_protection.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: true,
        syncStartedAt: date,
        skipToken: null,
      },
    });
  });
});
