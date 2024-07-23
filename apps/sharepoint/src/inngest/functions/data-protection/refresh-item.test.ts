import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import type { SharepointPermission } from '@/connectors/microsoft/sharepoint/permissions';
import * as permissionsConnector from '@/connectors/microsoft/sharepoint/permissions';
import { env } from '@/common/env';
import * as itemsConnector from '@/connectors/microsoft/sharepoint/items';
import { refreshItem } from './refresh-item';

const token = 'test-token';

const siteId = 'some-site-id';
const driveId = 'some-drive-id';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};

const itemId = 'item-id-1';
const itemName = 'item-name';
const parentId = 'some-parent-id-1';
const itemUrl = 'https://sharepoint.local/item';
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

const permissions: SharepointPermission[] = [
  {
    id: 'permission-id-1',
    link: { scope: 'anonymous' },
  },
  {
    id: 'permission-id-2',
    grantedToV2: {
      user: {
        id: 'user-id-1',
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
          id: 'user-id-1',
          email: 'user1@org.local',
        },
      },
      {
        user: {
          id: 'user-id-2',
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
    siteId,
    driveId,
  },
};

const setup = createInngestFunctionMock(
  refreshItem,
  'sharepoint/data_protection.refresh_object.requested'
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
    expect(itemsConnector.getItem).toBeCalledWith({ driveId, itemId, siteId, token });

    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(2);
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      driveId,
      itemId,
      siteId,
      token,
    });
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      driveId,
      itemId: parentId,
      siteId,
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
          metadata: { driveId, siteId },
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
              id: 'user-user-id-1',
              metadata: {
                directPermissionId: 'permission-id-2',
                email: 'user1@org.local',
                linksPermissionIds: ['permission-id-3'],
                type: 'user',
              },
              type: 'user',
              userId: 'user-id-1',
            },
            {
              email: 'user2@org.local',
              id: 'user-user-id-2',
              metadata: {
                email: 'user2@org.local',
                linksPermissionIds: ['permission-id-3'],
                type: 'user',
              },
              type: 'user',
              userId: 'user-id-2',
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
    expect(itemsConnector.getItem).toBeCalledWith({ driveId, itemId, siteId, token });

    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(2);
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      driveId,
      itemId,
      siteId,
      token,
    });
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      driveId,
      itemId: parentId,
      siteId,
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
          metadata: { driveId, siteId },
          name: itemName,
          ownerId: itemOwnerId,
          permissions: [
            {
              email: 'user1@org.local',
              id: 'user-user-id-1',
              metadata: {
                directPermissionId: 'permission-id-2',
                email: 'user1@org.local',
                linksPermissionIds: ['permission-id-3'],
                type: 'user',
              },
              type: 'user',
              userId: 'user-id-1',
            },
            {
              email: 'user2@org.local',
              id: 'user-user-id-2',
              metadata: {
                email: 'user2@org.local',
                linksPermissionIds: ['permission-id-3'],
                type: 'user',
              },
              type: 'user',
              userId: 'user-id-2',
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
    expect(itemsConnector.getItem).toBeCalledWith({ driveId, itemId, siteId, token });

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
    expect(itemsConnector.getItem).toBeCalledWith({ driveId, itemId, siteId, token });

    expect(permissionsConnector.getAllItemPermissions).toBeCalledTimes(2);
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      driveId,
      itemId,
      siteId,
      token,
    });
    expect(permissionsConnector.getAllItemPermissions).toBeCalledWith({
      driveId,
      itemId: parentId,
      siteId,
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
