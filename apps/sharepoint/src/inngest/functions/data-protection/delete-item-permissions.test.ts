import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { MicrosoftError } from '@/common/error';
import * as permissionsConnector from '@/connectors/microsoft/sharepoint/permissions';
import {
  type UserPermissionMetadata,
  type AnyonePermissionMetadata,
} from '@/connectors/elba/data-protection';
import { deleteDataProtectionItemPermissions } from './delete-item-permissions';
import { type ElbaPermissionToDelete } from './common/types';

const token = 'test-token';
const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const itemId = 'some-item-id';

const permissionCommon = {
  driveId,
  itemId,
  siteId,
  token,
};

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};

const permissions: ElbaPermissionToDelete[] = [
  {
    id: 'anyone-permission',
    metadata: {
      type: 'anyone',
      permissionIds: ['anyone-permission-id-1', 'anyone-permission-id-2'],
    } satisfies AnyonePermissionMetadata,
  },
  {
    id: 'permission-user',
    metadata: {
      type: 'user',
      email: 'user1@org',
      linksPermissionIds: ['user-link-permission-id-1', 'user-link-permission-id-2'],
      directPermissionId: 'user-permission-id-1',
    } satisfies UserPermissionMetadata,
  },
  {
    id: 'permission-user',
    metadata: {
      type: 'user',
      email: 'user2@org',
      linksPermissionIds: ['user-link-permission-id-1', 'user-link-permission-id-3'],
      directPermissionId: 'user-permission-id-2',
    } satisfies UserPermissionMetadata,
  },
];

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
  'sharepoint/data_protection.delete_object_permissions.requested'
);

describe('delete-object', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should abort deletation when organisation is not registered', async () => {
    vi.spyOn(permissionsConnector, 'deleteItemPermission').mockResolvedValue('deleted');
    vi.spyOn(permissionsConnector, 'revokeUsersFromLinkPermission').mockResolvedValue('deleted');

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.run).toBeCalledTimes(0);
    expect(permissionsConnector.deleteItemPermission).toBeCalledTimes(0);
    expect(permissionsConnector.revokeUsersFromLinkPermission).toBeCalledTimes(0);
  });

  test('should successfully delete item permissions', async () => {
    vi.spyOn(permissionsConnector, 'deleteItemPermission')
      .mockResolvedValueOnce('ignored')
      .mockResolvedValue('deleted');
    vi.spyOn(permissionsConnector, 'revokeUsersFromLinkPermission')
      .mockResolvedValueOnce('ignored')
      .mockResolvedValue('deleted');

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toEqual({
      deletedPermissions: [
        { permissionId: 'anyone-permission-id-2' },
        { permissionId: 'user-permission-id-1' },
        { permissionId: 'user-permission-id-2' },
        { permissionId: 'user-link-permission-id-2', userEmails: ['user1@org'] },
        { permissionId: 'user-link-permission-id-3', userEmails: ['user2@org'] },
      ],
      ignoredPermissions: [
        { permissionId: 'anyone-permission-id-1' },
        { permissionId: 'user-link-permission-id-1', userEmails: ['user1@org', 'user2@org'] },
      ],
      unexpectedFailedPermissions: [],
    });

    expect(step.run).toBeCalledTimes(7);

    expect(permissionsConnector.deleteItemPermission).toBeCalledTimes(4);
    expect(permissionsConnector.deleteItemPermission).toHaveBeenNthCalledWith(1, {
      ...permissionCommon,
      permissionId: 'anyone-permission-id-1',
    });
    expect(permissionsConnector.deleteItemPermission).toHaveBeenNthCalledWith(2, {
      ...permissionCommon,
      permissionId: 'anyone-permission-id-2',
    });
    expect(permissionsConnector.deleteItemPermission).toHaveBeenNthCalledWith(3, {
      ...permissionCommon,
      permissionId: 'user-permission-id-1',
    });
    expect(permissionsConnector.deleteItemPermission).toHaveBeenNthCalledWith(4, {
      ...permissionCommon,
      permissionId: 'user-permission-id-2',
    });

    expect(permissionsConnector.revokeUsersFromLinkPermission).toBeCalledTimes(3);
    expect(permissionsConnector.revokeUsersFromLinkPermission).toHaveBeenNthCalledWith(1, {
      ...permissionCommon,
      permissionId: 'user-link-permission-id-1',
      userEmails: ['user1@org', 'user2@org'],
    });
    expect(permissionsConnector.revokeUsersFromLinkPermission).toHaveBeenNthCalledWith(2, {
      ...permissionCommon,
      permissionId: 'user-link-permission-id-2',
      userEmails: ['user1@org'],
    });
    expect(permissionsConnector.revokeUsersFromLinkPermission).toHaveBeenNthCalledWith(3, {
      ...permissionCommon,
      permissionId: 'user-link-permission-id-3',
      userEmails: ['user2@org'],
    });
  });

  test('should ignore failed permissions', async () => {
    vi.spyOn(permissionsConnector, 'deleteItemPermission')
      .mockRejectedValueOnce(new MicrosoftError('Unknown permission error'))
      .mockResolvedValue('deleted');
    vi.spyOn(permissionsConnector, 'revokeUsersFromLinkPermission')
      .mockRejectedValueOnce(new MicrosoftError('Unknown users link permission error'))
      .mockResolvedValue('deleted');

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toEqual({
      deletedPermissions: [
        { permissionId: 'anyone-permission-id-2' },
        { permissionId: 'user-permission-id-1' },
        { permissionId: 'user-permission-id-2' },
        { permissionId: 'user-link-permission-id-2', userEmails: ['user1@org'] },
        { permissionId: 'user-link-permission-id-3', userEmails: ['user2@org'] },
      ],
      ignoredPermissions: [],
      unexpectedFailedPermissions: [
        { permissionId: 'anyone-permission-id-1' },
        { permissionId: 'user-link-permission-id-1', userEmails: ['user1@org', 'user2@org'] },
      ],
    });

    expect(step.run).toBeCalledTimes(7);

    expect(permissionsConnector.deleteItemPermission).toBeCalledTimes(4);
    expect(permissionsConnector.deleteItemPermission).toHaveBeenNthCalledWith(1, {
      ...permissionCommon,
      permissionId: 'anyone-permission-id-1',
    });
    expect(permissionsConnector.deleteItemPermission).toHaveBeenNthCalledWith(2, {
      ...permissionCommon,
      permissionId: 'anyone-permission-id-2',
    });
    expect(permissionsConnector.deleteItemPermission).toHaveBeenNthCalledWith(3, {
      ...permissionCommon,
      permissionId: 'user-permission-id-1',
    });
    expect(permissionsConnector.deleteItemPermission).toHaveBeenNthCalledWith(4, {
      ...permissionCommon,
      permissionId: 'user-permission-id-2',
    });

    expect(permissionsConnector.revokeUsersFromLinkPermission).toBeCalledTimes(3);
    expect(permissionsConnector.revokeUsersFromLinkPermission).toHaveBeenNthCalledWith(1, {
      ...permissionCommon,
      permissionId: 'user-link-permission-id-1',
      userEmails: ['user1@org', 'user2@org'],
    });
    expect(permissionsConnector.revokeUsersFromLinkPermission).toHaveBeenNthCalledWith(2, {
      ...permissionCommon,
      permissionId: 'user-link-permission-id-2',
      userEmails: ['user1@org'],
    });
    expect(permissionsConnector.revokeUsersFromLinkPermission).toHaveBeenNthCalledWith(3, {
      ...permissionCommon,
      permissionId: 'user-link-permission-id-3',
      userEmails: ['user2@org'],
    });
  });
});
