import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as drivesConnector from '@/connectors/microsoft/sharepoint/drives';
import type { MicrosoftDrive } from '@/connectors/microsoft/sharepoint/drives';
import { encrypt } from '@/common/crypto';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { syncDrives } from './sync-drives';

const token = 'test-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};
const siteId = 'some-site-id';
const isFirstSync = false;

const drives: MicrosoftDrive[] = [{ id: 'drive-id-1' }, { id: 'drive-id-2' }];

const setupData = {
  siteId,
  organisationId: organisation.id,
  isFirstSync: false,
  skipToken: null,
};

const setup = createInngestFunctionMock(syncDrives, 'sharepoint/drives.sync.triggered');

describe('sync-drives', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(drivesConnector, 'getDrives').mockResolvedValue({
      nextSkipToken: null,
      driveIds: drives.map(({ id }) => id),
    });

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '15a76301-f1dd-4a77-b12a-9d7d3fca3c92', //fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(drivesConnector.getDrives).toBeCalledTimes(0);

    expect(step.waitForEvent).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const nextSkipToken = 'next-skip-token';
    const skipToken = null;

    vi.spyOn(drivesConnector, 'getDrives').mockResolvedValue({
      nextSkipToken,
      driveIds: drives.map(({ id }) => id),
    });
    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(drivesConnector.getDrives).toBeCalledTimes(1);
    expect(drivesConnector.getDrives).toBeCalledWith({
      siteId,
      token,
      skipToken,
    });

    expect(step.waitForEvent).toBeCalledTimes(drives.length);

    for (let i = 0; i < drives.length; i++) {
      const drive = drives[i];

      expect(step.waitForEvent).nthCalledWith(i + 1, `wait-for-items-complete-${drive?.id}`, {
        event: 'sharepoint/items.sync.completed',
        if: `async.data.organisationId == '${organisation.id}' && async.data.driveId == '${drive?.id}' && async.data.folderId == null`,
        timeout: '30d',
      });
    }

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'items-sync-triggered',
      drives.map(({ id }) => ({
        name: 'sharepoint/items.sync.triggered',
        data: {
          siteId,
          driveId: id,
          isFirstSync,
          folderId: null,
          permissionIds: [],
          skipToken,
          organisationId: organisation.id,
        },
      }))
    );

    expect(step.sendEvent).toBeCalledWith('sync-next-drives-page', {
      name: 'sharepoint/drives.sync.triggered',
      data: {
        siteId,
        isFirstSync,
        skipToken: nextSkipToken,
        organisationId: organisation.id,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const nextSkipToken = null;
    const skipToken = 'skip-token';

    vi.spyOn(drivesConnector, 'getDrives').mockResolvedValue({
      nextSkipToken,
      driveIds: drives.map(({ id }) => id),
    });
    const [result, { step }] = setup({ ...setupData, skipToken });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(drivesConnector.getDrives).toBeCalledTimes(1);
    expect(drivesConnector.getDrives).toBeCalledWith({
      siteId,
      token,
      skipToken,
    });

    expect(step.waitForEvent).toBeCalledTimes(drives.length);

    for (let i = 0; i < drives.length; i++) {
      const drive = drives[i];

      expect(step.waitForEvent).nthCalledWith(i + 1, `wait-for-items-complete-${drive?.id}`, {
        event: 'sharepoint/items.sync.completed',
        if: `async.data.organisationId == '${organisation.id}' && async.data.driveId == '${drive?.id}' && async.data.folderId == null`,
        timeout: '30d',
      });
    }

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'items-sync-triggered',
      drives.map(({ id }) => ({
        name: 'sharepoint/items.sync.triggered',
        data: {
          siteId,
          driveId: id,
          isFirstSync,
          folderId: null,
          permissionIds: [],
          skipToken: nextSkipToken,
          organisationId: organisation.id,
        },
      }))
    );

    expect(step.sendEvent).toBeCalledWith('drives-sync-complete', {
      name: 'sharepoint/drives.sync.completed',
      data: {
        organisationId: organisation.id,
        siteId,
      },
    });
  });
});
