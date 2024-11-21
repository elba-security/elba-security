import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/onedrive/items';
import type { OnedrivePermission } from '@/connectors/microsoft/onedrive/permissions';
import * as permissionsConnector from '@/connectors/microsoft/onedrive/permissions';
import { env } from '@/common/env';
import * as itemsConnector from '@/connectors/microsoft/onedrive/items';
import { refreshDataProtectionObject } from './refresh-item';

const token = 'test-token';

const userId = 'some-user-id';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};

const itemId = 'item-id-1';
const itemName = 'item-name';
const parentId = 'some-parent-id-1';
const itemUrl = 'https://onedrive.local/item';
const itemOwnerId = 'some-user-id-1';
const itemLastModifiedAt = '2024-02-23T15:50:09Z';

const item: MicrosoftDriveItem = {
  id: itemId,
  name: itemName,
  webUrl: itemUrl,
  createdBy: { user: { id: itemOwnerId } },
  parentReference: { id: parentId },
  lastModifiedDateTime: itemLastModifiedAt,
};

// TODO
const permissions: OnedrivePermission[] = [
  {
    id: 'permission-id-1',
    link: { scope: 'anonymous' },
  },
  {
    id: 'permission-id-2',
    grantedToV2: {
      user: {
        email: 'user1@org.local',
      },
    },
  },
  {
    id: 'permission-id-3',
    link: { scope: 'users' },
    grantedToIdentitiesV2: [
      {
        user: {
          email: 'user1@org.local',
        },
      },
      {
        user: {
          email: 'user2@org.local',
        },
      },
    ],
  },
];

const setupData = {
  id: itemId,
  organisationId: organisation.id,
  metadata: {
    userId,
  },
};

const setup = createInngestFunctionMock(
  refreshDataProtectionObject,
  'onedrive/data_protection.refresh_object.requested'
);

describe('refresh-object', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should abort refresh when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(itemsConnector, 'getItem').mockResolvedValue(item);
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockResolvedValue(permissions);

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.run).toBeCalledTimes(0);
    expect(itemsConnector.getItem).toBeCalledTimes(0);
    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
  });

  test('should successfully update elba data protection object', async () => {
    const elba = spyOnElba();

    vi.spyOn(itemsConnector, 'getItem').mockResolvedValueOnce(item);
    vi.spyOn(permissionsConnector, 'getAllItemPermissions')
      .mockResolvedValueOnce(permissions)
      .mockResolvedValueOnce([]);

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'updated' });

    expect(step.run).toBeCalledTimes(2);
    expect(step.run).toBeCalledWith('get-item-permissions', expect.any(Function));
    expect(step.run).toBeCalledWith('get-parent-permissions', expect.any(Function));

    expect(itemsConnector.getItem).toBeCalledTimes(1);
    expect(itemsConnector.getItem).toBeCalledWith({ userId, itemId, token });

    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(2);
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      userId,
      itemId,
      token,
    });
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      userId,
      itemId: parentId,
      token,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(0);

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [
        {
          id: itemId,
          metadata: { userId },
          name: itemName,
          ownerId: itemOwnerId,
          permissions: [
            {
              id: 'anyone',
              metadata: { permissionIds: ['permission-id-1'], type: 'anyone' },
              type: 'anyone',
            },
            {
              email: 'user1@org.local',
              id: 'user-user1@org.local',
              metadata: {
                directPermissionId: 'permission-id-2',
                email: 'user1@org.local',
                linksPermissionIds: ['permission-id-3'],
                type: 'user',
              },
              type: 'user',
            },
            {
              email: 'user2@org.local',
              id: 'user-user2@org.local',
              metadata: {
                email: 'user2@org.local',
                linksPermissionIds: ['permission-id-3'],
                type: 'user',
              },
              type: 'user',
            },
          ],
          updatedAt: itemLastModifiedAt,
          url: itemUrl,
        },
      ],
    });
  });

  test('should update elba data protection object ignoring inherited permissions', async () => {
    const elba = spyOnElba();

    vi.spyOn(itemsConnector, 'getItem').mockResolvedValueOnce(item);
    vi.spyOn(permissionsConnector, 'getAllItemPermissions')
      .mockResolvedValueOnce(permissions)
      .mockResolvedValueOnce(permissions.slice(0, 1));

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'updated' });

    expect(step.run).toBeCalledTimes(2);
    expect(step.run).toBeCalledWith('get-item-permissions', expect.any(Function));
    expect(step.run).toBeCalledWith('get-parent-permissions', expect.any(Function));

    expect(itemsConnector.getItem).toBeCalledTimes(1);
    expect(itemsConnector.getItem).toBeCalledWith({ userId, itemId, token });

    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(2);
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      userId,
      itemId,
      token,
    });
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      userId,
      itemId: parentId,
      token,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(0);

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [
        {
          id: itemId,
          metadata: { userId },
          name: itemName,
          ownerId: itemOwnerId,
          permissions: [
            {
              email: 'user1@org.local',
              id: 'user-user1@org.local',
              metadata: {
                directPermissionId: 'permission-id-2',
                email: 'user1@org.local',
                linksPermissionIds: ['permission-id-3'],
                type: 'user',
              },
              type: 'user',
            },
            {
              email: 'user2@org.local',
              id: 'user-user2@org.local',
              metadata: {
                email: 'user2@org.local',
                linksPermissionIds: ['permission-id-3'],
                type: 'user',
              },
              type: 'user',
            },
          ],
          updatedAt: itemLastModifiedAt,
          url: itemUrl,
        },
      ],
    });
  });

  test("should delete elba data protection object when item doesn't exist anymore", async () => {
    const elba = spyOnElba();

    vi.spyOn(itemsConnector, 'getItem').mockResolvedValueOnce(null);
    vi.spyOn(permissionsConnector, 'getAllItemPermissions')
      .mockResolvedValueOnce(permissions)
      .mockResolvedValueOnce([]);

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'deleted' });
    expect(step.run).toBeCalledTimes(1);
    expect(step.run).toBeCalledWith('get-item-permissions', expect.any(Function));

    expect(itemsConnector.getItem).toBeCalledTimes(1);
    expect(itemsConnector.getItem).toBeCalledWith({ userId, itemId, token });

    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(0);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({ ids: [itemId] });

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(0);
  });

  test("should delete elba data protection object when item doesn't have non inherited permissions", async () => {
    const elba = spyOnElba();

    vi.spyOn(itemsConnector, 'getItem').mockResolvedValueOnce(item);
    vi.spyOn(permissionsConnector, 'getAllItemPermissions')
      .mockResolvedValueOnce(permissions)
      .mockResolvedValueOnce(permissions);

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'deleted' });
    expect(step.run).toBeCalledTimes(2);
    expect(step.run).toBeCalledWith('get-item-permissions', expect.any(Function));
    expect(step.run).toBeCalledWith('get-parent-permissions', expect.any(Function));

    expect(itemsConnector.getItem).toBeCalledTimes(1);
    expect(itemsConnector.getItem).toBeCalledWith({ userId, itemId, token });

    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(2);
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      userId,
      itemId,
      token,
    });
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      userId,
      itemId: parentId,
      token,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({ ids: [itemId] });

    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(0);
  });
});
