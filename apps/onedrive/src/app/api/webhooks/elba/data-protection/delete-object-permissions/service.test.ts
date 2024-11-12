import { expect, test, describe, vi, beforeEach } from 'vitest';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import { inngest } from '@/inngest/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import type { ElbaPermissionToDelete } from '@/inngest/functions/data-protection/common/types';
import {
  type AnyonePermissionMetadata,
  type UserPermissionMetadata,
} from '@/connectors/elba/data-protection';
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

const count = 5;

const permissions: ElbaPermissionToDelete[] = Array.from({ length: count }, (_, i) => {
  if (i === 1)
    return {
      id: `some-random-id-${i}`,
      metadata: {
        type: 'anyone',
        permissionIds: [],
      } satisfies AnyonePermissionMetadata,
    };

  return {
    id: `some-random-id-${i}`,
    metadata: {
      type: 'user',
      email: `user-email-${i}@someemail.com`,
      linksPermissionIds: [
        `user-email-${i}@someemail.com`,
        `user-email-${i * 1000}@someemail.com`,
        `user-email-${i * 10000}@someemail.com`,
      ],
      directPermissionId: `some-random-id-${i}`,
    } satisfies UserPermissionMetadata,
  };
});

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
          userId,
        },
        permissions,
      },
    });

    expect(response.status).toBe(200);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'onedrive/data_protection.delete_object_permissions.requested',
      data: {
        id: itemId,
        organisationId: organisation.id,
        metadata: {
          userId,
        },
        permissions,
      },
    });
  });
});
