import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as spacePermissionsConnector from '@/connectors/confluence/space-permissions';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { accessToken, organisation } from '../__mocks__/organisations';
import { deleteSpacePermissions } from './delete-space-permission';

const spaceKey = 'space-key';
const permissionIds = Array.from({ length: 10 }, (_, i) => `permission-${i}`);

const setup = createInngestFunctionMock(
  deleteSpacePermissions,
  'confluence/data_protection.delete_space_permissions.requested'
);

describe('delete-space-permissions', () => {
  test('should abort when organisation is not registered', async () => {
    vi.spyOn(spacePermissionsConnector, 'deleteSpacePermission').mockResolvedValue();
    const [result] = setup({
      organisationId: organisation.id,
      spaceKey,
      permissionIds,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(spacePermissionsConnector.deleteSpacePermission).toBeCalledTimes(0);
  });

  test('should delete space permissions', async () => {
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(spacePermissionsConnector, 'deleteSpacePermission').mockResolvedValue();
    const [result] = setup({
      organisationId: organisation.id,
      spaceKey,
      permissionIds,
    });

    await expect(result).resolves.toBeUndefined();
    expect(spacePermissionsConnector.deleteSpacePermission).toBeCalledTimes(permissionIds.length);
    for (let i = 0; i < permissionIds.length; i++) {
      expect(spacePermissionsConnector.deleteSpacePermission).toHaveBeenNthCalledWith(i + 1, {
        accessToken,
        instanceId: organisation.instanceId,
        spaceKey,
        id: `permission-${i}`,
      });
    }
  });
});
