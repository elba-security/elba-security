import { beforeEach, expect, test, describe, vi } from 'vitest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { encrypt } from '@/common/crypto';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import { organisationsTable } from '@/database/schema';
import { POST as handler } from './route';

const token = 'test-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};

const itemId = 'some-item-id';
const userId = 'some-user-id';

describe('refreshObject', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should send request to refresh object', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockNextRequest({
      handler,
      body: {
        id: itemId,
        organisationId: organisation.id,
        metadata: {
          userId,
        },
      },
    });

    expect(response.status).toBe(200);
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'onedrive/data_protection.refresh_object.requested',
      data: {
        id: itemId,
        organisationId: organisation.id,
        metadata: {
          userId,
        },
      },
    });
  });
});
