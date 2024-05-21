import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable, usersTable } from '@/database/schema';
import * as googlePermissions from '@/connectors/google/permissions';
import * as googleFiles from '@/connectors/google/files';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import { refreshDataProtectionObject } from './refresh-object';

const setup = createInngestFunctionMock(
  refreshDataProtectionObject,
  'google/data_protection.refresh_object.requested'
);

describe('refresh-data-protection-object', () => {
  test('should refresh data protection object successfully', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googleFiles, 'getGoogleFile').mockImplementation(({ fileId }) => {
      return Promise.resolve({
        id: fileId as unknown as string,
        name: 'file-name',
        sha256Checksum: 'sha256-checksum',
        viewedByMeTime: '2024-01-01T00:00:00Z',
      });
    });

    vi.spyOn(googlePermissions, 'listAllGoogleFileNonInheritedPermissions').mockResolvedValue([
      {
        id: 'user',
        type: 'user',
        emailAddress: 'user@org.local',
      },
      {
        id: 'anyone',
        type: 'anyone',
      },
    ]);

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
    });

    await expect(result).resolves.toStrictEqual({
      status: 'updated',
    });

    expect(step.run).toBeCalledTimes(3);
    expect(step.run).toBeCalledWith('get-user', expect.any(Function));

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('user@org.local');

    const authClient = serviceAccountClientSpy.mock.results[0]?.value as unknown;

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      baseUrl: 'https://elba.local/api',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(step.run).toBeCalledWith('get-file', expect.any(Function));

    expect(googleFiles.getGoogleFile).toBeCalledTimes(1);
    expect(googleFiles.getGoogleFile).toBeCalledWith({
      auth: authClient,
      fileId: 'object-id',
    });

    expect(step.run).toBeCalledWith('list-permissions', expect.any(Function));

    expect(googlePermissions.listAllGoogleFileNonInheritedPermissions).toBeCalledTimes(1);
    expect(googlePermissions.listAllGoogleFileNonInheritedPermissions).toBeCalledWith({
      auth: authClient,
      fileId: 'object-id',
    });

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [
        {
          contentHash: 'sha256-checksum',
          id: 'object-id',
          lastAccessedAt: '2024-01-01T00:00:00Z',
          metadata: {
            ownerId: 'user-id',
          },
          name: 'file-name',
          ownerId: 'user-id',
          permissions: [
            {
              domain: 'org.local',
              email: 'user@org.local',
              id: 'user',
              type: 'user',
            },
            {
              domain: undefined,
              email: undefined,
              id: 'anyone',
              type: 'anyone',
            },
          ],
          url: 'https://drive.google.com/open?id=object-id',
        },
      ],
    });

    expect(elbaInstance?.dataProtection.deleteObjects).not.toBeCalled();
  });

  test("should delete data protection object successfully if file doesn't exist anymore", async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googleFiles, 'getGoogleFile').mockResolvedValue(null);

    vi.spyOn(googlePermissions, 'listAllGoogleFileNonInheritedPermissions');

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
    });

    await expect(result).resolves.toStrictEqual({
      status: 'deleted',
    });

    expect(step.run).toBeCalledTimes(2);
    expect(step.run).toBeCalledWith('get-user', expect.any(Function));

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('user@org.local');

    const authClient = serviceAccountClientSpy.mock.results[0]?.value as unknown;

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      baseUrl: 'https://elba.local/api',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(step.run).toBeCalledWith('get-file', expect.any(Function));

    expect(googleFiles.getGoogleFile).toBeCalledTimes(1);
    expect(googleFiles.getGoogleFile).toBeCalledWith({
      auth: authClient,
      fileId: 'object-id',
    });

    expect(step.run).not.toBeCalledWith('list-permissions', expect.any(Function));

    expect(googlePermissions.listAllGoogleFileNonInheritedPermissions).not.toBeCalled();

    expect(elbaInstance?.dataProtection.updateObjects).not.toBeCalled();
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({ ids: ['object-id'] });
  });
});
