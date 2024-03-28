import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable, usersTable } from '@/database/schema';
import * as googleDrives from '@/connectors/google/drives';
import * as googlePermissions from '@/connectors/google/permissions';
import * as googleMembers from '@/connectors/google/members';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import { syncDataProtectionSharedDrives } from './sync-shared-drives';

const setup = createInngestFunctionMock(
  syncDataProtectionSharedDrives,
  'google/data_protection.sync.drives.shared.requested'
);

describe('sync-data-protection-shared-drives', () => {
  test('should synchronize data protection for shared drives and handle pagination successfully', async () => {
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googleDrives, 'listGoogleSharedDriveIds').mockResolvedValue({
      nextPageToken: 'next-page-token',
      sharedDriveIds: ['shared-drive-id-1', 'shared-drive-id-2', 'shared-drive-id-3'],
    });

    vi.spyOn(googlePermissions, 'listAllGoogleSharedDriveManagerPermissions').mockImplementation(
      ({ fileId }) => {
        const permissions: googlePermissions.GoogleSharedDriveManagerPermission[] = [
          {
            emailAddress: 'group@org.local',
            role: 'organizer',
            type: 'group',
          },
        ];

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- this is a mock
        if (['shared-drive-id-1', 'shared-drive-id-2'].includes(fileId!)) {
          permissions.push({
            emailAddress: 'user@org.local',
            role: 'organizer',
            type: 'user',
          });
        }

        if (fileId === 'shared-drive-id-1') {
          permissions.push({
            emailAddress: 'admin@org.local',
            role: 'organizer',
            type: 'user',
          });
        }

        return Promise.resolve(permissions);
      }
    );

    vi.spyOn(googleMembers, 'listAllGoogleMembers').mockResolvedValue([
      {
        email: 'user3@org.local',
        id: 'user-id-3',
        status: 'ACTIVE',
        type: 'USER',
      },
    ]);

    await db.insert(organisationsTable).values([
      {
        googleAdminEmail: 'admin@org.local',
        googleCustomerId: 'google-customer-id-1',
        id: '00000000-0000-0000-0000-000000000000',
        region: 'eu',
      },
      {
        googleAdminEmail: 'admin@other.local',
        googleCustomerId: 'google-customer-id-2',
        id: '00000000-0000-0000-0000-000000000001',
        region: 'eu',
      },
    ]);
    await db.insert(usersTable).values([
      {
        id: 'user-id-1',
        email: 'admin@org.local',
        organisationId: '00000000-0000-0000-0000-000000000000',
        lastSyncedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'user-id-2',
        email: 'user@org.local',
        organisationId: '00000000-0000-0000-0000-000000000000',
        lastSyncedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'other-user-id-1',
        email: 'john.doe@other.local',
        organisationId: '00000000-0000-0000-0000-000000000001',
        lastSyncedAt: '2024-01-01T00:00:00Z',
      },
    ]);

    const [result, { step }] = setup({
      googleAdminEmail: 'admin@org.local',
      isFirstSync: true,
      organisationId: '00000000-0000-0000-0000-000000000000',
      pageToken: null,
      region: 'eu',
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('admin@org.local', true);

    expect(step.run).toBeCalledTimes(5);
    expect(step.run).toBeCalledWith('list-shared-drives', expect.any(Function));

    expect(googleDrives.listGoogleSharedDriveIds).toBeCalledTimes(1);
    expect(googleDrives.listGoogleSharedDriveIds).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      pageSize: 100,
      pageToken: undefined,
    });

    expect(step.run).toBeCalledWith(
      'list-shared-drive-shared-drive-id-1-permissions',
      expect.any(Function)
    );
    expect(step.run).toBeCalledWith(
      'list-shared-drive-shared-drive-id-2-permissions',
      expect.any(Function)
    );
    expect(step.run).toBeCalledWith(
      'list-shared-drive-shared-drive-id-3-permissions',
      expect.any(Function)
    );

    expect(googlePermissions.listAllGoogleSharedDriveManagerPermissions).toBeCalledTimes(3);
    expect(googlePermissions.listAllGoogleSharedDriveManagerPermissions).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      fileId: 'shared-drive-id-1',
      pageSize: 100,
      useDomainAdminAccess: true,
    });
    expect(googlePermissions.listAllGoogleSharedDriveManagerPermissions).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      fileId: 'shared-drive-id-2',
      pageSize: 100,
      useDomainAdminAccess: true,
    });
    expect(googlePermissions.listAllGoogleSharedDriveManagerPermissions).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      fileId: 'shared-drive-id-3',
      pageSize: 100,
      useDomainAdminAccess: true,
    });

    expect(googleMembers.listAllGoogleMembers).toBeCalledTimes(1);
    expect(googleMembers.listAllGoogleMembers).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      groupKey: 'group@org.local',
      maxResults: 200,
      roles: 'OWNER',
    });

    expect(step.run).toBeCalledWith('get-users', expect.any(Function));

    expect(step.waitForEvent).toBeCalledTimes(3);
    expect(step.waitForEvent).toBeCalledWith('sync-shared-drive-shared-drive-id-1-completed', {
      event: 'google/data_protection.sync.drive.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000' && async.data.managerUserId == 'user-id-1' && async.data.driveId == 'shared-drive-id-1'",
      timeout: '1day',
    });
    expect(step.waitForEvent).toBeCalledWith('sync-shared-drive-shared-drive-id-2-completed', {
      event: 'google/data_protection.sync.drive.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000' && async.data.managerUserId == 'user-id-2' && async.data.driveId == 'shared-drive-id-2'",
      timeout: '1day',
    });
    expect(step.waitForEvent).toBeCalledWith('sync-shared-drive-shared-drive-id-3-completed', {
      event: 'google/data_protection.sync.drive.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000' && async.data.managerUserId == 'user-id-3' && async.data.driveId == 'shared-drive-id-3'",
      timeout: '1day',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('sync-shared-drives', [
      {
        data: {
          driveId: 'shared-drive-id-3',
          isFirstSync: true,
          managerEmail: 'user3@org.local',
          managerUserId: 'user-id-3',
          organisationId: '00000000-0000-0000-0000-000000000000',
          pageToken: null,
          region: 'eu',
        },
        name: 'google/data_protection.sync.drive.requested',
      },
      {
        data: {
          driveId: 'shared-drive-id-1',
          isFirstSync: true,
          managerEmail: 'admin@org.local',
          managerUserId: 'user-id-1',
          organisationId: '00000000-0000-0000-0000-000000000000',
          pageToken: null,
          region: 'eu',
        },
        name: 'google/data_protection.sync.drive.requested',
      },
      {
        data: {
          driveId: 'shared-drive-id-2',
          isFirstSync: true,
          managerEmail: 'user@org.local',
          managerUserId: 'user-id-2',
          organisationId: '00000000-0000-0000-0000-000000000000',
          pageToken: null,
          region: 'eu',
        },
        name: 'google/data_protection.sync.drive.requested',
      },
    ]);

    expect(step.sendEvent).toBeCalledWith('sync-next-page-shared-drives', {
      data: {
        googleAdminEmail: 'admin@org.local',
        isFirstSync: true,
        organisationId: '00000000-0000-0000-0000-000000000000',
        pageToken: 'next-page-token',
        region: 'eu',
      },
      name: 'google/data_protection.sync.drives.shared.requested',
    });
  });

  test('should synchronize data protection for shared drives and stop when pagination is over', async () => {
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();

    vi.spyOn(googleDrives, 'listGoogleSharedDriveIds').mockResolvedValue({
      nextPageToken: null,
      sharedDriveIds: ['shared-drive-id-1', 'shared-drive-id-2', 'shared-drive-id-3'],
    });

    vi.spyOn(googlePermissions, 'listAllGoogleSharedDriveManagerPermissions').mockImplementation(
      ({ fileId }) => {
        const permissions: googlePermissions.GoogleSharedDriveManagerPermission[] = [
          {
            emailAddress: 'group@org.local',
            role: 'organizer',
            type: 'group',
          },
        ];

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- this is a mock
        if (['shared-drive-id-1', 'shared-drive-id-2'].includes(fileId!)) {
          permissions.push({
            emailAddress: 'user@org.local',
            role: 'organizer',
            type: 'user',
          });
        }

        if (fileId === 'shared-drive-id-1') {
          permissions.push({
            emailAddress: 'admin@org.local',
            role: 'organizer',
            type: 'user',
          });
        }

        return Promise.resolve(permissions);
      }
    );

    vi.spyOn(googleMembers, 'listAllGoogleMembers').mockResolvedValue([
      {
        email: 'user3@org.local',
        id: 'user-id-3',
        status: 'ACTIVE',
        type: 'USER',
      },
    ]);

    await db.insert(organisationsTable).values([
      {
        googleAdminEmail: 'admin@org.local',
        googleCustomerId: 'google-customer-id-1',
        id: '00000000-0000-0000-0000-000000000000',
        region: 'eu',
      },
      {
        googleAdminEmail: 'admin@other.local',
        googleCustomerId: 'google-customer-id-2',
        id: '00000000-0000-0000-0000-000000000001',
        region: 'eu',
      },
    ]);
    await db.insert(usersTable).values([
      {
        id: 'user-id-1',
        email: 'admin@org.local',
        organisationId: '00000000-0000-0000-0000-000000000000',
        lastSyncedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'user-id-2',
        email: 'user@org.local',
        organisationId: '00000000-0000-0000-0000-000000000000',
        lastSyncedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'other-user-id-1',
        email: 'john.doe@other.local',
        organisationId: '00000000-0000-0000-0000-000000000001',
        lastSyncedAt: '2024-01-01T00:00:00Z',
      },
    ]);

    const [result, { step }] = setup({
      googleAdminEmail: 'admin@org.local',
      isFirstSync: true,
      organisationId: '00000000-0000-0000-0000-000000000000',
      pageToken: 'page-token',
      region: 'eu',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('admin@org.local', true);

    expect(step.run).toBeCalledTimes(5);
    expect(step.run).toBeCalledWith('list-shared-drives', expect.any(Function));

    expect(googleDrives.listGoogleSharedDriveIds).toBeCalledTimes(1);
    expect(googleDrives.listGoogleSharedDriveIds).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      pageSize: 100,
      pageToken: 'page-token',
    });

    expect(step.run).toBeCalledWith(
      'list-shared-drive-shared-drive-id-1-permissions',
      expect.any(Function)
    );
    expect(step.run).toBeCalledWith(
      'list-shared-drive-shared-drive-id-2-permissions',
      expect.any(Function)
    );
    expect(step.run).toBeCalledWith(
      'list-shared-drive-shared-drive-id-3-permissions',
      expect.any(Function)
    );

    expect(googlePermissions.listAllGoogleSharedDriveManagerPermissions).toBeCalledTimes(3);
    expect(googlePermissions.listAllGoogleSharedDriveManagerPermissions).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      fileId: 'shared-drive-id-1',
      pageSize: 100,
      useDomainAdminAccess: true,
    });
    expect(googlePermissions.listAllGoogleSharedDriveManagerPermissions).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      fileId: 'shared-drive-id-2',
      pageSize: 100,
      useDomainAdminAccess: true,
    });
    expect(googlePermissions.listAllGoogleSharedDriveManagerPermissions).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      fileId: 'shared-drive-id-3',
      pageSize: 100,
      useDomainAdminAccess: true,
    });

    expect(googleMembers.listAllGoogleMembers).toBeCalledTimes(1);
    expect(googleMembers.listAllGoogleMembers).toBeCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
      auth: serviceAccountClientSpy.mock.results[0]?.value,
      groupKey: 'group@org.local',
      maxResults: 200,
      roles: 'OWNER',
    });

    expect(step.run).toBeCalledWith('get-users', expect.any(Function));

    expect(step.waitForEvent).toBeCalledTimes(3);
    expect(step.waitForEvent).toBeCalledWith('sync-shared-drive-shared-drive-id-1-completed', {
      event: 'google/data_protection.sync.drive.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000' && async.data.managerUserId == 'user-id-1' && async.data.driveId == 'shared-drive-id-1'",
      timeout: '1day',
    });
    expect(step.waitForEvent).toBeCalledWith('sync-shared-drive-shared-drive-id-2-completed', {
      event: 'google/data_protection.sync.drive.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000' && async.data.managerUserId == 'user-id-2' && async.data.driveId == 'shared-drive-id-2'",
      timeout: '1day',
    });
    expect(step.waitForEvent).toBeCalledWith('sync-shared-drive-shared-drive-id-3-completed', {
      event: 'google/data_protection.sync.drive.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000' && async.data.managerUserId == 'user-id-3' && async.data.driveId == 'shared-drive-id-3'",
      timeout: '1day',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('sync-shared-drives', [
      {
        data: {
          driveId: 'shared-drive-id-3',
          isFirstSync: true,
          managerEmail: 'user3@org.local',
          managerUserId: 'user-id-3',
          organisationId: '00000000-0000-0000-0000-000000000000',
          pageToken: null,
          region: 'eu',
        },
        name: 'google/data_protection.sync.drive.requested',
      },
      {
        data: {
          driveId: 'shared-drive-id-1',
          isFirstSync: true,
          managerEmail: 'admin@org.local',
          managerUserId: 'user-id-1',
          organisationId: '00000000-0000-0000-0000-000000000000',
          pageToken: null,
          region: 'eu',
        },
        name: 'google/data_protection.sync.drive.requested',
      },
      {
        data: {
          driveId: 'shared-drive-id-2',
          isFirstSync: true,
          managerEmail: 'user@org.local',
          managerUserId: 'user-id-2',
          organisationId: '00000000-0000-0000-0000-000000000000',
          pageToken: null,
          region: 'eu',
        },
        name: 'google/data_protection.sync.drive.requested',
      },
    ]);

    expect(step.sendEvent).toBeCalledWith('sync-shared-drives-completed', {
      data: {
        organisationId: '00000000-0000-0000-0000-000000000000',
      },
      name: 'google/data_protection.sync.drives.shared.completed',
    });
  });
});
