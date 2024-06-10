import { beforeEach, expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import * as itemsConnector from '@/connectors/microsoft/sharepoint/items';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import * as permissionsConnector from '@/connectors/microsoft/sharepoint/permissions';
import type { MicrosoftDriveItemPermissions } from '@/connectors/microsoft/sharepoint/permissions';
import { encrypt } from '@/common/crypto';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { syncItems } from './sync-items';
import { formatDataProtectionItems, groupItems, removeInheritedSync } from './common/helpers';
import type { ItemsWithPermisions } from './common/types';

const token = 'test-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};
const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const folderId = 'some-folder-id';
const isFirstSync = false;

const itemsCount = 10;

const createTempData = (title: string, i: number): MicrosoftDriveItem => ({
  id: `${title}-id-${i}`,
  name: `${title}-name-${i}`,
  webUrl: `http://${title}-webUrl-${i}.somedomain.net`,
  createdBy: {
    user: {
      email: `${title}-user-email-${i}@someemail.com`,
      id: `${title}-user-id-${i}`,
      displayName: `${title}user-displayName-${i}`,
    },
  },
  parentReference: {
    id: `${title}-parent-id-${i}`,
  },
  lastModifiedDateTime: `2024-02-23T15:50:0${i}Z`,
});

const groupedItems: MicrosoftDriveItem[] = Array.from({ length: itemsCount }, (_, i) => {
  const parentReference = { id: i === 0 ? undefined : `item-id-${i - 1}` };
  if (i < itemsCount / 2) {
    return {
      ...createTempData('item', i),
      parentReference,
    };
  }
  return {
    ...createTempData('folder', i),
    folder: { childCount: i },
    parentReference,
  };
});

const mockPermissions = (itemCount: number): MicrosoftDriveItemPermissions[] => {
  return Array.from({ length: itemCount }, (_, i) => ({
    id: `permission-id-${i}`,
    roles: ['write'],
    link: { scope: 'users' },
    grantedToV2: {
      user: {
        displayName: `some-display-name-${i}`,
        id: `some-user-id-${i}`,
        email: `some-user-email-${i}`,
      },
    },
    grantedToIdentitiesV2: [
      {
        user: {
          displayName: `some-display-name-${i}`,
          id: `some-user-id-${i}`,
          email: `some-user-email-${i}`,
        },
      },
    ],
  }));
};

const setupData = {
  siteId,
  driveId,
  isFirstSync,
  folder: null,
  skipToken: null,
  organisationId: organisation.id,
};

const setup = createInngestFunctionMock(syncItems, 'sharepoint/items.sync.triggered');

describe('sync-items', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(itemsConnector, 'getItems').mockResolvedValue({
      nextSkipToken: null,
      items: groupedItems,
    });

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '15a76301-f1dd-4a77-b12a-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(itemsConnector.getItems).toBeCalledTimes(0);

    expect(step.waitForEvent).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const nextSkipToken = 'next-skip-token';
    const skipToken = null;
    const defaultEventsCount = 1;
    const elba = spyOnElba();
    const permissions = mockPermissions(itemsCount);

    vi.spyOn(itemsConnector, 'getItems').mockResolvedValue({
      items: groupedItems,
      nextSkipToken,
    });
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockResolvedValue({
      permissions,
      nextSkipToken: skipToken,
    });

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.run).toBeCalledTimes(2);

    expect(itemsConnector.getItems).toBeCalledTimes(1);
    expect(itemsConnector.getItems).toBeCalledWith({
      token,
      siteId,
      driveId,
      folderId: null,
      skipToken,
    });

    const { folders, files } = groupItems(groupedItems);

    if (folders.length) {
      expect(step.sendEvent).toBeCalledTimes(defaultEventsCount + 1);
      expect(step.sendEvent).toBeCalledWith(
        'items.sync.triggered',
        folders.map(({ id }) => ({
          name: 'sharepoint/items.sync.triggered',
          data: {
            siteId,
            driveId,
            isFirstSync,
            folder: { id, paginated: false, permissions: [] },
            skipToken: null,
            organisationId: organisation.id,
          },
        }))
      );

      expect(step.waitForEvent).toBeCalledTimes(folders.length);

      for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];

        expect(step.waitForEvent).nthCalledWith(i + 1, `wait-for-folders-complete-${folder?.id}`, {
          event: 'sharepoint/foder-items.sync.completed',
          if: `async.data.organisationId == '${organisation.id}' && async.data.folderId == '${folder?.id}'`,
          timeout: '1d',
        });
      }
    }

    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(groupedItems.length);

    for (const item of [...folders, ...files]) {
      expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
        token,
        siteId,
        driveId,
        itemId: item.id,
      });
    }

    const itemsWithPermisionsResult = [...folders, ...files].map((item) => ({
      item,
      permissions: permissions.map((permission) =>
        permissionsConnector.validateAndParsePermission(
          permission as unknown as MicrosoftDriveItemPermissions
        )
      ),
    }));

    const dataProtectionItems = formatDataProtectionItems({
      itemsWithPermisions: itemsWithPermisionsResult as unknown as ItemsWithPermisions[],
      siteId,
      driveId,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: dataProtectionItems,
    });

    expect(step.sendEvent).toBeCalledWith('sync-next-items-page', {
      name: 'sharepoint/items.sync.triggered',
      data: {
        siteId,
        driveId,
        isFirstSync,
        folder: { id: null, paginated: false, permissions: [] },
        skipToken: nextSkipToken,
        organisationId: organisation.id,
      },
    });
  });

  test('should finalize the sync when there is no next page', async () => {
    const nextSkipToken = null;
    const skipToken = 'skip-token';
    const defaultEventsCount = 1;
    const elba = spyOnElba();
    let callCount = 1;

    vi.spyOn(itemsConnector, 'getItems').mockResolvedValue({
      items: groupedItems,
      nextSkipToken,
    });

    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockImplementation(() => {
      const itemCount = callCount === itemsCount + 1 ? itemsCount / 2 : itemsCount;
      callCount++;

      return Promise.resolve({
        permissions: mockPermissions(itemCount),
        nextSkipToken: skipToken,
      });
    });

    const [result, { step }] = setup({
      ...setupData,
      folder: { id: 'some-folder-id', paginated: false, permissions: ['some-permission-id'] },
      skipToken,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.run).toBeCalledTimes(2);

    expect(itemsConnector.getItems).toBeCalledTimes(1);
    expect(itemsConnector.getItems).toBeCalledWith({
      token,
      siteId,
      driveId,
      folderId: 'some-folder-id',
      skipToken,
    });

    const { folders, files } = groupItems(groupedItems);

    if (folders.length) {
      expect(step.sendEvent).toBeCalledTimes(defaultEventsCount + 1);
      expect(step.sendEvent).toBeCalledWith(
        'items.sync.triggered',
        folders.map(({ id }) => ({
          name: 'sharepoint/items.sync.triggered',
          data: {
            siteId,
            driveId,
            isFirstSync,
            folder: { id, paginated: false, permissions: [] },
            skipToken: null,
            organisationId: organisation.id,
          },
        }))
      );

      expect(step.waitForEvent).toBeCalledTimes(folders.length);

      for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];

        expect(step.waitForEvent).nthCalledWith(i + 1, `wait-for-folders-complete-${folder?.id}`, {
          event: 'sharepoint/foder-items.sync.completed',
          if: `async.data.organisationId == '${organisation.id}' && async.data.folderId == '${folder?.id}'`,
          timeout: '1d',
        });
      }
    }

    // One additional call to get parent folder permissions if we have one
    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(groupedItems.length + 1);

    for (const item of [...folders, ...files]) {
      expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
        token,
        siteId,
        driveId,
        itemId: item.id,
      });
    }

    const itemsWithPermisionsResult = [...folders, ...files].map((item) => ({
      item,
      permissions: mockPermissions(itemsCount).map((permission) =>
        permissionsConnector.validateAndParsePermission(
          permission as unknown as MicrosoftDriveItemPermissions
        )
      ),
    }));

    const dataProtectionItems = formatDataProtectionItems({
      itemsWithPermisions: removeInheritedSync(
        mockPermissions(itemsCount / 2).map((permission) => permission.id),
        itemsWithPermisionsResult as ItemsWithPermisions[]
      ),
      siteId,
      driveId,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: dataProtectionItems,
    });

    expect(step.sendEvent).toBeCalledWith('folders-sync-complete', {
      name: 'sharepoint/foder-items.sync.completed',
      data: {
        organisationId: organisation.id,
        folderId,
      },
    });
  });

  test('should call elba.dataProtection.updateObjects', async () => {
    const nextSkipToken = null;
    const skipToken = 'skip-token';
    const elba = spyOnElba();
    const permissions = mockPermissions(itemsCount);

    vi.spyOn(itemsConnector, 'getItems').mockResolvedValue({
      items: groupedItems.filter((item) => !item.folder),
      nextSkipToken,
    });
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockResolvedValue({
      permissions,
      nextSkipToken: skipToken,
    });

    const [result, { step }] = setup({ ...setupData, folder: null, skipToken });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.run).toBeCalledTimes(2);

    expect(itemsConnector.getItems).toBeCalledTimes(1);
    expect(itemsConnector.getItems).toBeCalledWith({
      token,
      siteId,
      driveId,
      folderId: null,
      skipToken,
    });

    const { files } = groupItems(groupedItems);

    expect(step.waitForEvent).toBeCalledTimes(0);

    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(files.length);

    for (const item of [...files]) {
      expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
        token,
        siteId,
        driveId,
        itemId: item.id,
      });
    }

    const itemsWithPermisionsResult = [...files].map((item) => ({
      item,
      permissions: permissions.map((permission) =>
        permissionsConnector.validateAndParsePermission(
          permission as unknown as MicrosoftDriveItemPermissions
        )
      ),
    }));

    const dataProtectionItems = formatDataProtectionItems({
      itemsWithPermisions: itemsWithPermisionsResult as unknown as ItemsWithPermisions[],
      siteId,
      driveId,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: dataProtectionItems,
    });

    expect(step.sendEvent).toBeCalledWith('items-sync-complete', {
      name: 'sharepoint/items.sync.completed',
      data: {
        organisationId: organisation.id,
        driveId,
      },
    });
  });
});
