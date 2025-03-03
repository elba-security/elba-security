import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as nangoAPI from '@/common/nango';
import * as spacePermissionsConnector from '@/connectors/confluence/space-permissions';
import * as authConnector from '@/connectors/confluence/auth';
import { accessToken } from '../__mocks__/organisations';
import { deleteSpacePermissions } from './delete-space-permission';

const organisationId = '00000000-0000-0000-0000-000000000002';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const instanceId = 'test-instance-id';

const spaceKey = 'space-key';
const permissionIds = Array.from({ length: 10 }, (_, i) => `permission-${i}`);

const setup = createInngestFunctionMock(
  deleteSpacePermissions,
  'confluence/data_protection.delete_space_permissions.requested'
);

describe('delete-space-permissions', () => {
  test('should delete space permissions', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(authConnector, 'getInstance').mockResolvedValue({
      id: 'test-instance-id',
      url: 'test-instance-url',
    });
    vi.spyOn(spacePermissionsConnector, 'deleteSpacePermission').mockResolvedValue();
    const [result] = setup({
      organisationId,
      spaceKey,
      permissionIds,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();
    expect(spacePermissionsConnector.deleteSpacePermission).toBeCalledTimes(permissionIds.length);
    for (let i = 0; i < permissionIds.length; i++) {
      expect(spacePermissionsConnector.deleteSpacePermission).toHaveBeenNthCalledWith(i + 1, {
        accessToken,
        instanceId,
        spaceKey,
        id: `permission-${i}`,
      });
    }
  });
});
