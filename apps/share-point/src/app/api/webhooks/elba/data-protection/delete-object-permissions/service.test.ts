import { expect, test, describe, vi, beforeEach } from 'vitest';
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

const itemId = 'some-item-id';
const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const permissionId = 'some-permissionId-id';
const permissions = ['some-permissionId-id'];

describe('deleteObjectPermissions', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should send request to delete the object permissions', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockNextRequest({
      handler,
      body: {
        id: itemId,
        organisationId: organisation.id,
        metadata: {
          siteId,
          driveId,
        },
        permissions: [
          {
            id: permissionId,
          },
        ],
      },
    });

    expect(response.status).toBe(200);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'share-point/data_protection.delete_object_permissions.requested',
      data: {
        id: itemId,
        organisationId: organisation.id,
        metadata: {
          siteId,
          driveId,
        },
        permissions,
      },
    });
  });
});
