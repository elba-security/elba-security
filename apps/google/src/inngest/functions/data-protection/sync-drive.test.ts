import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as googleFiles from '@/connectors/google/files';
import * as googlePermissions from '@/connectors/google/permissions';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import { syncDataProtectionDrive } from './sync-drive';

const setup = createInngestFunctionMock(
  syncDataProtectionDrive,
  'google/data_protection.sync.drive.requested'
);

describe('sync-data-protection-drive', () => {
  test('should synchronize data protection drive and handle pagination successfully', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googleFiles, 'listGoogleFiles').mockResolvedValue({
      files: [
        {
          id: 'file-id-1',
          name: 'file 1',
          sha256Checksum: 'sha256-checksum-1',
          viewedByMeTime: '2024-01-01T00:00:00Z',
        },
        {
          id: 'file-id-2',
          name: 'file 2',
        },
      ],
      nextPageToken: 'next-page-token',
    });

    vi.spyOn(googlePermissions, 'listAllGoogleFileNonInheritedPermissions').mockImplementation(
      ({ fileId }) => {
        return Promise.resolve([
          {
            id: `${fileId}-permission-id-1`,
            type: 'anyone',
          },
          {
            id: `${fileId}-permission-id-2`,
            type: 'user',
            emailAddress: 'user@org.local',
          },
        ]);
      }
    );

    const [result, { step }] = setup({
      driveId: null,
      isFirstSync: true,
      managerEmail: 'admin@org.local',
      managerUserId: 'user-id-1',
      organisationId: '00000000-0000-0000-0000-000000000000',
      pageToken: null,
      region: 'eu',
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('admin@org.local');

    expect(step.run).toBeCalledTimes(3);
    expect(step.run).toBeCalledWith('list-files', expect.any(Function));

    expect(googleFiles.listGoogleFiles).toBeCalledTimes(1);
    expect(googleFiles.listGoogleFiles).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      pageSize: 250,
      pageToken: undefined,
      q: '"admin@org.local" in owners and mimeType != \'application/vnd.google-apps.folder\'',
    });

    expect(step.run).toBeCalledWith('list-files-permissions', expect.any(Function));

    expect(googlePermissions.listAllGoogleFileNonInheritedPermissions).toBeCalledTimes(2);
    expect(googlePermissions.listAllGoogleFileNonInheritedPermissions).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      fileId: 'file-id-1',
    });
    expect(googlePermissions.listAllGoogleFileNonInheritedPermissions).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      fileId: 'file-id-2',
    });

    expect(step.run).toBeCalledWith('finalize', expect.any(Function));

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      baseUrl: 'https://elba.local/api',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [
        {
          contentHash: 'sha256-checksum-1',
          id: 'file-id-1',
          lastAccessedAt: '2024-01-01T00:00:00Z',
          metadata: {
            ownerId: 'user-id-1',
          },
          name: 'file 1',
          ownerId: 'user-id-1',
          permissions: [
            {
              id: 'file-id-1-permission-id-1',
              type: 'anyone',
            },
            {
              domain: 'org.local',
              email: 'user@org.local',
              id: 'file-id-1-permission-id-2',
              type: 'user',
            },
          ],
          url: 'https://drive.google.com/open?id=file-id-1',
        },
        {
          id: 'file-id-2',
          metadata: {
            ownerId: 'user-id-1',
          },
          name: 'file 2',
          ownerId: 'user-id-1',
          permissions: [
            {
              id: 'file-id-2-permission-id-1',
              type: 'anyone',
            },
            {
              domain: 'org.local',
              email: 'user@org.local',
              id: 'file-id-2-permission-id-2',
              type: 'user',
            },
          ],
          url: 'https://drive.google.com/open?id=file-id-2',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-files', {
      data: {
        driveId: null,
        isFirstSync: true,
        managerEmail: 'admin@org.local',
        managerUserId: 'user-id-1',
        organisationId: '00000000-0000-0000-0000-000000000000',
        pageToken: 'next-page-token',
        region: 'eu',
      },
      name: 'google/data_protection.sync.drive.requested',
    });
  });

  test('should synchronize data protection drive and stop when pagination is over', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googleFiles, 'listGoogleFiles').mockResolvedValue({
      files: [
        {
          id: 'file-id-1',
          name: 'file 1',
          sha256Checksum: 'sha256-checksum-1',
          viewedByMeTime: '2024-01-01T00:00:00Z',
        },
        {
          id: 'file-id-2',
          name: 'file 2',
        },
      ],
      nextPageToken: null,
    });

    vi.spyOn(googlePermissions, 'listAllGoogleFileNonInheritedPermissions').mockImplementation(
      ({ fileId }) => {
        return Promise.resolve([
          {
            id: `${fileId}-permission-id-1`,
            type: 'anyone',
          },
          {
            id: `${fileId}-permission-id-2`,
            type: 'user',
            emailAddress: 'user@org.local',
          },
        ]);
      }
    );

    const [result, { step }] = setup({
      driveId: 'drive-id-1',
      isFirstSync: false,
      managerEmail: 'user@org.local',
      managerUserId: 'user-id-1',
      organisationId: '00000000-0000-0000-0000-000000000000',
      pageToken: 'page-token',
      region: 'eu',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('user@org.local');

    expect(step.run).toBeCalledTimes(3);
    expect(step.run).toBeCalledWith('list-files', expect.any(Function));

    expect(googleFiles.listGoogleFiles).toBeCalledTimes(1);
    expect(googleFiles.listGoogleFiles).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      corpora: 'drive',
      driveId: 'drive-id-1',
      includeItemsFromAllDrives: true,
      pageSize: 250,
      pageToken: 'page-token',
      supportsAllDrives: true,
    });

    expect(step.run).toBeCalledWith('list-files-permissions', expect.any(Function));

    expect(googlePermissions.listAllGoogleFileNonInheritedPermissions).toBeCalledTimes(2);
    expect(googlePermissions.listAllGoogleFileNonInheritedPermissions).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      fileId: 'file-id-1',
      pageSize: 100,
    });
    expect(googlePermissions.listAllGoogleFileNonInheritedPermissions).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      fileId: 'file-id-2',
      pageSize: 100,
    });

    expect(step.run).toBeCalledWith('finalize', expect.any(Function));

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      baseUrl: 'https://elba.local/api',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [
        {
          contentHash: 'sha256-checksum-1',
          id: 'file-id-1',
          lastAccessedAt: '2024-01-01T00:00:00Z',
          metadata: {
            ownerId: 'user-id-1',
          },
          name: 'file 1',
          ownerId: 'user-id-1',
          permissions: [
            {
              id: 'file-id-1-permission-id-1',
              type: 'anyone',
            },
            {
              domain: 'org.local',
              email: 'user@org.local',
              id: 'file-id-1-permission-id-2',
              type: 'user',
            },
          ],
          url: 'https://drive.google.com/open?id=file-id-1',
        },
        {
          id: 'file-id-2',
          metadata: {
            ownerId: 'user-id-1',
          },
          name: 'file 2',
          ownerId: 'user-id-1',
          permissions: [
            {
              id: 'file-id-2-permission-id-1',
              type: 'anyone',
            },
            {
              domain: 'org.local',
              email: 'user@org.local',
              id: 'file-id-2-permission-id-2',
              type: 'user',
            },
          ],
          url: 'https://drive.google.com/open?id=file-id-2',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-next-page-files', {
      data: {
        driveId: 'drive-id-1',
        managerUserId: 'user-id-1',
        organisationId: '00000000-0000-0000-0000-000000000000',
      },
      name: 'google/data_protection.sync.drive.completed',
    });
  });
});
