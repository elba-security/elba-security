import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable, usersTable } from '@/database/schema';
import { syncDataProtectionPersonalDrives } from './sync-personal-drives';

const setup = createInngestFunctionMock(
  syncDataProtectionPersonalDrives,
  'google/data_protection.sync.drives.personal.requested'
);

describe('sync-data-protection-personal-drives', () => {
  test('should synchronize data protection for personal drives and handle pagination successfully', async () => {
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
        id: 'user-id-3',
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

    expect(step.run).toBeCalledTimes(1);
    expect(step.run).toBeCalledWith('list-users', expect.any(Function));

    expect(step.waitForEvent).toBeCalledTimes(2);
    expect(step.waitForEvent).toBeCalledWith('sync-personal-drive-user-id-1-completed', {
      event: 'google/data_protection.sync.drive.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000' && async.data.managerUserId == 'user-id-1' && async.data.driveId == null",
      timeout: '30 days',
    });
    expect(step.waitForEvent).toBeCalledWith('sync-personal-drive-user-id-2-completed', {
      event: 'google/data_protection.sync.drive.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000' && async.data.managerUserId == 'user-id-2' && async.data.driveId == null",
      timeout: '30 days',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('sync-personal-drives', [
      {
        data: {
          driveId: null,
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
          driveId: null,
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

    expect(step.sendEvent).toBeCalledWith('sync-next-page-personal-drives', {
      data: {
        googleAdminEmail: 'admin@org.local',
        isFirstSync: true,
        organisationId: '00000000-0000-0000-0000-000000000000',
        pageToken: 2,
        region: 'eu',
      },
      name: 'google/data_protection.sync.drives.personal.requested',
    });
  });

  test('should synchronize data protection for personal drives and stop when pagination is over', async () => {
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
        id: 'user-id-3',
        email: 'john.doe@other.local',
        organisationId: '00000000-0000-0000-0000-000000000001',
        lastSyncedAt: '2024-01-01T00:00:00Z',
      },
    ]);

    const [result, { step }] = setup({
      googleAdminEmail: 'admin@org.local',
      isFirstSync: true,
      organisationId: '00000000-0000-0000-0000-000000000000',
      pageToken: 2,
      region: 'eu',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.run).toBeCalledTimes(1);
    expect(step.run).toBeCalledWith('list-users', expect.any(Function));

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-personal-drives-completed', {
      data: {
        organisationId: '00000000-0000-0000-0000-000000000000',
      },
      name: 'google/data_protection.sync.drives.personal.completed',
    });
  });
});
