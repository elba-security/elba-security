import { beforeEach, expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import * as itemsConnector from '@/connectors/microsoft/sharepoint/items';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import * as permissionsConnector from '@/connectors/microsoft/sharepoint/permissions';
import type { SharepointPermission } from '@/connectors/microsoft/sharepoint/permissions';
import { encrypt } from '@/common/crypto';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { syncItems } from './sync-items';

const token = 'test-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};
const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const folderId = null;
const isFirstSync = true;

const items: MicrosoftDriveItem[] = [
  {
    name: 'item-name-1',
    id: 'item-id-1',
    createdBy: {
      user: {
        id: 'user-id-1',
      },
    },
    webUrl: 'https://sharepoint.local/item1',
    lastModifiedDateTime: '2024-01-01T00:00:00Z',
    parentReference: {
      id: 'parent-id-1',
    },
    folder: { childCount: 1 },
  },
  {
    name: 'item-name-2',
    id: 'item-id-2',
    createdBy: {
      user: {
        id: 'user-id-1',
      },
    },
    webUrl: 'https://sharepoint.local/item2',
    lastModifiedDateTime: '2024-01-01T00:00:00Z',
    parentReference: {
      id: 'parent-id-1',
    },
  },
];

const createPermission = (n: number): SharepointPermission[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `permission-id-${i + 1}`,
    link: { scope: 'anonymous' },
  }));

const itemPermissions = new Map([
  ['item-id-1', createPermission(2)],
  ['item-id-2', createPermission(1)],
]);

const setupData = {
  siteId,
  driveId,
  isFirstSync,
  folderId,
  permissionIds: ['permission-id-1'],
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
      items,
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
    const elba = spyOnElba();

    vi.spyOn(itemsConnector, 'getItems').mockResolvedValue({ items, nextSkipToken });
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockImplementation(({ itemId }) =>
      Promise.resolve(itemPermissions.get(itemId) || [])
    );

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.run).toBeCalledTimes(2);
    expect(step.run).toHaveBeenNthCalledWith(1, 'paginate', expect.any(Function));
    expect(step.run).toHaveBeenNthCalledWith(2, 'update-elba-objects', expect.any(Function));

    expect(itemsConnector.getItems).toBeCalledTimes(1);
    expect(itemsConnector.getItems).toBeCalledWith({
      token,
      siteId,
      driveId,
      folderId,
      skipToken: null,
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
      objects: [
        {
          id: 'item-id-1',
          metadata: { driveId: 'some-drive-id', siteId: 'some-site-id' },
          name: 'item-name-1',
          ownerId: 'user-id-1',
          permissions: [
            {
              id: 'anyone',
              metadata: { permissionIds: ['permission-id-2'], type: 'anyone' },
              type: 'anyone',
            },
          ],
          updatedAt: '2024-01-01T00:00:00Z',
          url: 'https://sharepoint.local/item1',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toHaveBeenNthCalledWith(1, 'sync-folders-items', [
      {
        name: 'sharepoint/items.sync.triggered',
        data: {
          driveId,
          folderId: 'item-id-1',
          isFirstSync,
          organisationId: organisation.id,
          permissionIds: ['permission-id-1', 'permission-id-2'],
          siteId,
          skipToken: null,
        },
      },
    ]);
    expect(step.sendEvent).toHaveBeenNthCalledWith(2, 'sync-next-items-page', {
      name: 'sharepoint/items.sync.triggered',
      data: {
        driveId,
        folderId,
        isFirstSync,
        organisationId: organisation.id,
        permissionIds: ['permission-id-1'],
        siteId,
        skipToken: nextSkipToken,
      },
    });
  });

  test('should finalize the sync when there is no next page', async () => {
    const nextSkipToken = null;
    const elba = spyOnElba();

    vi.spyOn(itemsConnector, 'getItems').mockResolvedValue({ items, nextSkipToken });
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockImplementation(({ itemId }) =>
      Promise.resolve(itemPermissions.get(itemId) || [])
    );

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.run).toBeCalledTimes(2);
    expect(step.run).toHaveBeenNthCalledWith(1, 'paginate', expect.any(Function));
    expect(step.run).toHaveBeenNthCalledWith(2, 'update-elba-objects', expect.any(Function));

    expect(itemsConnector.getItems).toBeCalledTimes(1);
    expect(itemsConnector.getItems).toBeCalledWith({
      token,
      siteId,
      driveId,
      folderId,
      skipToken: null,
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
      objects: [
        {
          id: 'item-id-1',
          metadata: { driveId: 'some-drive-id', siteId: 'some-site-id' },
          name: 'item-name-1',
          ownerId: 'user-id-1',
          permissions: [
            {
              id: 'anyone',
              metadata: { permissionIds: ['permission-id-2'], type: 'anyone' },
              type: 'anyone',
            },
          ],
          updatedAt: '2024-01-01T00:00:00Z',
          url: 'https://sharepoint.local/item1',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(3);
    expect(step.sendEvent).toHaveBeenNthCalledWith(1, 'sync-folders-items', [
      {
        name: 'sharepoint/items.sync.triggered',
        data: {
          driveId,
          folderId: 'item-id-1',
          isFirstSync,
          organisationId: organisation.id,
          permissionIds: ['permission-id-1', 'permission-id-2'],
          siteId,
          skipToken: null,
        },
      },
    ]);
    expect(step.sendEvent).toHaveBeenNthCalledWith(2, 'sync-complete', {
      name: 'sharepoint/items.sync.completed',
      data: {
        driveId,
        folderId,
        organisationId: organisation.id,
      },
    });
    expect(step.sendEvent).toHaveBeenNthCalledWith(3, 'initialize-delta', {
      name: 'sharepoint/delta.initialize.requested',
      data: {
        driveId,
        isFirstSync,
        organisationId: organisation.id,
        siteId,
      },
    });
  });
});
