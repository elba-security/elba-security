import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { MicrosoftError } from '@/common/error';
import * as deleteItemPermisionConnector from '@/connectors/microsoft/share-point/permissions';
import { deleteDataProtectionItemPermissions } from './delete-item-permissions';

const token = 'test-token';

const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const itemId = 'some-item-id';
const notFoundPermissionId = 'not-found-permission-id';
const unexpectedFailedPermissionId = 'unexpected-failed-permission-id';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};

const permissions: string[] = Array.from({ length: 5 }, (_, i) => `some-permission-id-${i}`);

const permissionArray = [...permissions, notFoundPermissionId, unexpectedFailedPermissionId];

const setupData = {
  id: itemId,
  organisationId: organisation.id,
  metadata: {
    siteId,
    driveId,
  },
  permissions,
};

const setup = createInngestFunctionMock(
  deleteDataProtectionItemPermissions,
  'share-point/data_protection.delete_object_permissions.requested'
);

describe('delete-object', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should abort deletation when organisation is not registered', async () => {
    vi.spyOn(deleteItemPermisionConnector, 'deleteItemPermission').mockResolvedValue();

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.run).toBeCalledTimes(0);
    expect(deleteItemPermisionConnector.deleteItemPermission).toBeCalledTimes(0);
  });

  test('should delete object when item exists and return deleted permissions', async () => {
    vi.spyOn(deleteItemPermisionConnector, 'deleteItemPermission').mockResolvedValue();

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({
      deletedPermissions: permissions,
      notFoundPermissions: [],
      unexpectedFailedPermissions: [],
    });

    expect(step.run).toBeCalledTimes(permissions.length);
    expect(deleteItemPermisionConnector.deleteItemPermission).toBeCalledTimes(permissions.length);

    for (let i = 0; i < permissions.length; i++) {
      const permissionId = permissions[i];
      expect(deleteItemPermisionConnector.deleteItemPermission).nthCalledWith(i + 1, {
        token,
        itemId,
        siteId,
        driveId,
        permissionId,
      });
    }
  });

  test('should delete object when item exists and return deleted permissions and not found permission', async () => {
    vi.spyOn(deleteItemPermisionConnector, 'deleteItemPermission').mockImplementation(
      ({ permissionId }) => {
        if (permissionId === notFoundPermissionId) {
          return Promise.reject(
            new MicrosoftError('Could not delete item permission', {
              response: new Response(undefined, { status: 404 }),
            })
          );
        }
        if (permissionId === unexpectedFailedPermissionId) {
          return Promise.reject(
            new MicrosoftError('Could not delete item permission', {
              response: new Response(undefined, { status: 403 }),
            })
          );
        }
        return Promise.resolve();
      }
    );

    const [result, { step }] = setup({
      ...setupData,
      permissions: permissionArray,
    });

    await expect(result).resolves.toStrictEqual({
      deletedPermissions: permissions,
      notFoundPermissions: [notFoundPermissionId],
      unexpectedFailedPermissions: [unexpectedFailedPermissionId],
    });

    expect(step.run).toBeCalledTimes(permissionArray.length);
    expect(deleteItemPermisionConnector.deleteItemPermission).toBeCalledTimes(
      permissionArray.length
    );

    for (let i = 0; i < permissionArray.length; i++) {
      const permissionId = permissionArray[i];
      expect(deleteItemPermisionConnector.deleteItemPermission).nthCalledWith(i + 1, {
        token,
        itemId,
        siteId,
        driveId,
        permissionId,
      });
    }
  });
});
