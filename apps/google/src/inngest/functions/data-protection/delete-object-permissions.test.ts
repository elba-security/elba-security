import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable, usersTable } from '@/database/schema';
import * as googlePermissions from '@/connectors/google/permissions';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import { deleteDataProtectionObjectPermissions } from './delete-object-permissions';

const setup = createInngestFunctionMock(
  deleteDataProtectionObjectPermissions,
  'google/data_protection.delete_object_permissions.requested'
);

describe('delete-data-protection-object-permissions', () => {
  test('should delete data protection object permissions successfully', async () => {
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googlePermissions, 'deleteGooglePermission').mockImplementation(
      // @ts-expect-error -- this is a mock
      ({ permissionId }) => {
        const errors = {
          'permission-id-2': { code: 404, errors: [{ reason: 'notFound' }] },
          'permission-id-3': { code: 403, errors: [{ reason: 'insufficientFilePermissions' }] },
          'permission-id-4': { code: 500, errors: [{ reason: 'unknownError' }] },
        };
        if (errors[permissionId as unknown as string]) {
          return Promise.reject(errors[permissionId as unknown as string]);
        }
        return Promise.resolve(undefined);
      }
    );

    await db.insert(organisationsTable).values({
      googleAdminEmail: 'admin@org.local',
      googleCustomerId: 'google-customer-id',
      id: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });
    await db.insert(usersTable).values({
      email: 'user@org.local',
      id: 'user-id',
      organisationId: '00000000-0000-0000-0000-000000000000',
      lastSyncedAt: '2024-01-01T00:00:00Z',
    });

    const [result, { step }] = setup({
      organisationId: '00000000-0000-0000-0000-000000000000',
      objectId: 'object-id',
      ownerId: 'user-id',
      permissionIds: ['permission-id-1', 'permission-id-2', 'permission-id-3', 'permission-id-4'],
    });

    await expect(result).resolves.toStrictEqual({
      deletedPermissions: ['permission-id-1'],
      ignoredPermissions: ['permission-id-2', 'permission-id-3'],
      unexpectedFailedPermissionIds: ['permission-id-4'],
    });

    expect(step.run).toBeCalledTimes(4);
    expect(step.run).toBeCalledWith('delete-permission-permission-id-1', expect.any(Function));
    expect(step.run).toBeCalledWith('delete-permission-permission-id-2', expect.any(Function));
    expect(step.run).toBeCalledWith('delete-permission-permission-id-3', expect.any(Function));
    expect(step.run).toBeCalledWith('delete-permission-permission-id-4', expect.any(Function));

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('user@org.local');

    const authClient = serviceAccountClientSpy.mock.results[0]?.value as unknown;

    expect(googlePermissions.deleteGooglePermission).toBeCalledTimes(4);
    expect(googlePermissions.deleteGooglePermission).toBeCalledWith({
      auth: authClient,
      fileId: 'object-id',
      permissionId: 'permission-id-1',
    });
    expect(googlePermissions.deleteGooglePermission).toBeCalledWith({
      auth: authClient,
      fileId: 'object-id',
      permissionId: 'permission-id-2',
    });
    expect(googlePermissions.deleteGooglePermission).toBeCalledWith({
      auth: authClient,
      fileId: 'object-id',
      permissionId: 'permission-id-3',
    });
    expect(googlePermissions.deleteGooglePermission).toBeCalledWith({
      auth: authClient,
      fileId: 'object-id',
      permissionId: 'permission-id-4',
    });
  });
});
