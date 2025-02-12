import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { deleteObjectPermissions } from './delete-object-permissions';

const organisationId = '00000000-0000-0000-0000-000000000002';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

const pageId = 'page-id';
const spaceId = 'space-id';
const spaceKey = 'space-key';

const pagePermissions = Array.from({ length: 100 }, (_, i) => ({
  id: `permission-${i}`,
  metadata: {
    userId: 'user-id',
  },
  nangoConnectionId,
  region,
}));

const spacePermissions = Array.from({ length: 100 }, (_, i) => ({
  id: `permission-${i}`,
  metadata: {
    ids: ['1', '2'],
  },
  nangoConnectionId,
  region,
}));

const setup = createInngestFunctionMock(
  deleteObjectPermissions,
  'confluence/data_protection.delete_object_permissions.requested'
);

describe('delete-objects-permissions', () => {
  test('should request page restrictions deletion when object is a page', async () => {
    const [result, { step }] = setup({
      organisationId,
      permissions: pagePermissions,
      objectId: pageId,
      metadata: {
        objectType: 'page',
      },
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();
    const batchSize = env.DATA_PROTECTION_DELETE_PAGE_RETRICTIONS_BATCH_SIZE;
    const batchCount = Math.ceil(pagePermissions.length / batchSize);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'request-delete-page-restrictions',
      Array.from({ length: batchCount }, (_, i) => ({
        name: 'confluence/data_protection.delete_page_restrictions.requested',
        data: {
          organisationId,
          userIds: pagePermissions
            .slice(i * batchSize, (i + 1) * batchSize)
            .map((permission) => permission.metadata.userId),
          pageId,
          nangoConnectionId,
          region,
        },
      }))
    );
  });

  test('should request space permissions deletion when object is a space', async () => {
    const [result, { step }] = setup({
      organisationId,
      permissions: spacePermissions,
      objectId: spaceId,
      metadata: {
        objectType: 'space',
        type: 'personal',
        key: spaceKey,
      },
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();
    const batchSize = env.DATA_PROTECTION_DELETE_SPACE_PERMISSIONS_BATCH_SIZE;
    const permissionIds = spacePermissions.flatMap(({ metadata: { ids } }) => ids);
    const batchCount = Math.ceil(permissionIds.length / batchSize);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'request-delete-space-permissions',
      Array.from({ length: batchCount }, (_, i) => ({
        name: 'confluence/data_protection.delete_space_permissions.requested',
        data: {
          organisationId,
          permissionIds: permissionIds.slice(i * batchSize, (i + 1) * batchSize),
          spaceKey,
          nangoConnectionId,
          region,
        },
      }))
    );
  });
});
