import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { MicrosoftError } from '@/common/error';
import * as deleteItemPermissionConnector from '@/connectors/microsoft/sharepoint/permissions';
import { deleteDataProtectionItemPermissions } from './delete-item-permissions';
import type { CombinedLinkPermissions, SharepointDeletePermission } from './common/types';
import { preparePermissionDeletionArray } from './common/helpers';

const token = 'test-token';

const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const itemId = 'some-item-id';
const notFoundPermission: SharepointDeletePermission = {
  id: `some-not-found-permission-id`,
  metadata: {
    type: 'user',
    email: `user-email-14454@someemail.com`,
    directPermissionId: `some-not-found-permission-id`,
    linksPermissionIds: [],
  },
};

const unexpectedFailedPermission: SharepointDeletePermission = {
  id: `some-unexpected-failed-permission-id`,
  metadata: {
    type: 'user',
    email: `user-email-14454@someemail.com`,
    directPermissionId: `some-unexpected-failed-permission-id`,
    linksPermissionIds: [],
  },
};

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};

const count = 5;

const permissions: SharepointDeletePermission[] = Array.from({ length: count }, (_, i) => {
  if (i === 1)
    return {
      id: `some-random-id-${i}`,
      metadata: {
        type: 'anyone',
      },
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
    },
  };
});

const failedPermissionArray = [notFoundPermission, unexpectedFailedPermission];

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
    vi.spyOn(deleteItemPermissionConnector, 'deleteItemPermission').mockResolvedValue();
    vi.spyOn(deleteItemPermissionConnector, 'revokeUsersFromLinkPermission').mockResolvedValue();

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.run).toBeCalledTimes(0);
    expect(deleteItemPermissionConnector.deleteItemPermission).toBeCalledTimes(0);
    expect(deleteItemPermissionConnector.revokeUsersFromLinkPermission).toBeCalledTimes(0);
  });

  test('should delete object when item exists and return deleted permissions', async () => {
    vi.spyOn(deleteItemPermissionConnector, 'deleteItemPermission').mockResolvedValue();
    vi.spyOn(deleteItemPermissionConnector, 'revokeUsersFromLinkPermission').mockResolvedValue();

    const [result, { step }] = setup(setupData);

    const permissionDeletionArray = preparePermissionDeletionArray(permissions);

    await expect(result).resolves.toStrictEqual({
      deletedPermissions: permissionDeletionArray.map((el) => ({
        siteId,
        driveId,
        itemId,
        status: 204,
        userEmails: undefined,
        ...el,
      })),
      notFoundPermissions: [],
      unexpectedFailedPermissions: [],
    });

    expect(step.run).toBeCalledTimes(permissionDeletionArray.length);

    const { revokeUsersFromLinkPermissions, deleteItemPermissions } =
      permissionDeletionArray.reduce<{
        revokeUsersFromLinkPermissions: CombinedLinkPermissions[];
        deleteItemPermissions: CombinedLinkPermissions[];
      }>(
        (acc, el) => {
          if (el.userEmails?.length) acc.revokeUsersFromLinkPermissions.push(el);
          else acc.deleteItemPermissions.push(el);

          return acc;
        },
        { revokeUsersFromLinkPermissions: [], deleteItemPermissions: [] }
      );

    expect(deleteItemPermissionConnector.deleteItemPermission).toBeCalledTimes(
      deleteItemPermissions.length
    );
    expect(deleteItemPermissionConnector.revokeUsersFromLinkPermission).toBeCalledTimes(
      revokeUsersFromLinkPermissions.length
    );

    for (let i = 0; i < deleteItemPermissions.length; i++) {
      const permission = deleteItemPermissions[i];
      expect(deleteItemPermissionConnector.deleteItemPermission).nthCalledWith(i + 1, {
        token,
        itemId,
        siteId,
        driveId,
        permissionId: permission?.permissionId,
      });
    }

    for (let i = 0; i < revokeUsersFromLinkPermissions.length; i++) {
      const permission = revokeUsersFromLinkPermissions[i];
      expect(deleteItemPermissionConnector.revokeUsersFromLinkPermission).nthCalledWith(i + 1, {
        token,
        itemId,
        siteId,
        driveId,
        permissionId: permission?.permissionId,
        userEmails: permission?.userEmails,
      });
    }
  });

  test('should not found permission and unexpected failed permission', async () => {
    vi.spyOn(deleteItemPermissionConnector, 'deleteItemPermission').mockImplementation(
      ({ permissionId }) => {
        if (
          notFoundPermission.metadata.type === 'user' &&
          permissionId === notFoundPermission.metadata.directPermissionId
        ) {
          return Promise.reject(
            new MicrosoftError('Could not delete item permission', {
              response: new Response(undefined, { status: 404 }),
            })
          );
        }
        if (
          unexpectedFailedPermission.metadata.type === 'user' &&
          permissionId === unexpectedFailedPermission.metadata.directPermissionId
        ) {
          return Promise.reject(
            new MicrosoftError('Could not delete item permission', {
              response: new Response(undefined, { status: 500 }),
            })
          );
        }
        return Promise.resolve();
      }
    );
    vi.spyOn(deleteItemPermissionConnector, 'revokeUsersFromLinkPermission').mockResolvedValue();

    const [result, { step }] = setup({
      ...setupData,
      permissions: failedPermissionArray,
    });

    await expect(result).resolves.toStrictEqual({
      deletedPermissions: [],
      notFoundPermissions: [
        {
          siteId,
          driveId,
          itemId,
          status: 404,
          userEmails: undefined,
          permissionId:
            notFoundPermission.metadata.type === 'user' &&
            notFoundPermission.metadata.directPermissionId,
        },
      ],
      unexpectedFailedPermissions: [
        {
          siteId,
          driveId,
          itemId,
          status: 500,
          userEmails: undefined,
          permissionId:
            unexpectedFailedPermission.metadata.type === 'user' &&
            unexpectedFailedPermission.metadata.directPermissionId,
        },
      ],
    });

    expect(step.run).toBeCalledTimes(failedPermissionArray.length);
    expect(deleteItemPermissionConnector.deleteItemPermission).toBeCalledTimes(
      failedPermissionArray.length
    );

    for (let i = 0; i < failedPermissionArray.length; i++) {
      const permission = failedPermissionArray[i];
      expect(deleteItemPermissionConnector.deleteItemPermission).nthCalledWith(i + 1, {
        token,
        itemId,
        siteId,
        driveId,
        permissionId:
          permission?.metadata.type === 'user' && permission.metadata.directPermissionId,
      });
    }
  });
});
