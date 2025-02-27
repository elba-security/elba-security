import { expect, test, describe, vi } from 'vitest';
import { ZodError } from 'zod';
import { inngest } from '@/inngest/client';
import { deleteDataProtectionObjectPermissions } from './service';

const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const spaceEventData = {
  region: 'us' as const,
  nangoConnectionId,
  organisationId: 'organisation-id',
  id: 'object-id',
  metadata: {
    objectType: 'space',
    type: 'personal',
    key: 'space-key',
  },
  permissions: Array.from({ length: 10 }, (_, i) => ({
    id: `permission-${i}`,
    metadata: {
      ids: ['1', '2'],
    },
  })),
};

const invalidSpaceEventData = {
  region: 'us' as const,
  nangoConnectionId,
  organisationId: 'organisation-id',
  id: 'object-id',
  metadata: {
    objectType: 'space',
    type: 'personal',
    key: 'space-key',
  },
  permissions: Array.from({ length: 10 }, (_, i) => ({
    id: `permission-${i}`,
    metadata: {
      ids: ['1', '2'],
    },
  })).concat([
    {
      id: `permission-invalid`,
      metadata: {
        // @ts-expect-error this is a mock
        foo: 'bar',
      },
    },
  ]),
};

const pageEventData = {
  region: 'us' as const,
  nangoConnectionId,
  organisationId: 'organisation-id',
  id: 'object-id',
  metadata: {
    objectType: 'page',
  },
  permissions: Array.from({ length: 10 }, (_, i) => ({
    id: `permission-${i}`,
    metadata: {
      userId: 'user-id',
    },
  })),
};

const invalidPageEventData = {
  region: 'eu' as const,
  nangoConnectionId,
  organisationId: 'organisation-id',
  id: 'object-id',
  metadata: {
    objectType: 'page',
  },
  permissions: Array.from({ length: 10 }, (_, i) => ({
    id: `permission-${i}`,
    metadata: {
      userId: 'user-id',
    },
  })).concat([
    {
      id: `permission-invalid`,
      // @ts-expect-error this is a mock
      metadata: null,
    },
  ]),
};

describe('webhook deleteDataProtectionObjectPermissions', () => {
  test('should request data protection object permissions deletion when the object is a space', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await deleteDataProtectionObjectPermissions(spaceEventData);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'confluence/data_protection.delete_object_permissions.requested',
      data: {
        organisationId: spaceEventData.organisationId,
        objectId: spaceEventData.id,
        metadata: spaceEventData.metadata,
        permissions: spaceEventData.permissions,
        nangoConnectionId,
        region,
      },
    });
  });

  test('should request data protection object permissions deletion when the object is a page', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await deleteDataProtectionObjectPermissions(pageEventData);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'confluence/data_protection.delete_object_permissions.requested',
      data: {
        organisationId: pageEventData.organisationId,
        objectId: pageEventData.id,
        metadata: pageEventData.metadata,
        permissions: pageEventData.permissions,
        nangoConnectionId,
        region,
      },
    });
  });

  test('should throw when the object is a page and one of the permission has invalid metadata', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await expect(
      deleteDataProtectionObjectPermissions(invalidSpaceEventData)
    ).rejects.toBeInstanceOf(ZodError);

    expect(send).toBeCalledTimes(0);
  });

  test('should throw when the object is a space and one of the permission has invalid metadata', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    await expect(
      deleteDataProtectionObjectPermissions(invalidPageEventData)
    ).rejects.toBeInstanceOf(ZodError);

    expect(send).toBeCalledTimes(0);
  });
});
