import { beforeEach, expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { env } from '@/common/env';
import * as deltaConnector from '@/connectors/microsoft/delta/delta';
import type { MicrosoftDriveItem } from '@/connectors/microsoft/sharepoint/items';
import * as permissionsConnector from '@/connectors/microsoft/sharepoint/permissions';
import type { SharepointPermission } from '@/connectors/microsoft/sharepoint/permissions';
import { encrypt } from '@/common/crypto';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import * as subscriptionsConnector from '@/connectors/microsoft/subscriptions/subscriptions';
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
    shared: {},
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
    shared: {},
  },
];

const createPermission = (n: number): SharepointPermission[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `permission-id-${i + 1}`,
    link: { scope: 'anonymous' },
  }));

const itemPermissions = new Map([
  ['parent-id-1', createPermission(1)],
  ['item-id-1', createPermission(2)],
  ['item-id-2', createPermission(1)],
]);

const setupData = {
  siteId,
  driveId,
  isFirstSync,
  skipToken: null,
  organisationId: organisation.id,
};

const setup = createInngestFunctionMock(syncItems, 'sharepoint/items.sync.triggered');

describe('sync-items', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(deltaConnector, 'getDeltaItems').mockResolvedValue({
      items: { deleted: [], updated: [] },
      newDeltaToken: 'new-delta',
    });
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockImplementation(({ itemId }) =>
      Promise.resolve(itemPermissions.get(itemId) || [])
    );
    vi.spyOn(subscriptionsConnector, 'createSubscription').mockResolvedValue({
      clientState: 'client-state',
      expirationDateTime: '2024-01-01T00:00:00Z',
      id: 'subscription-id',
    });

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '15a76301-f1dd-4a77-b12a-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(deltaConnector.getDeltaItems).toBeCalledTimes(0);
    expect(deltaConnector.getDeltaItems).toBeCalledTimes(0);

    expect(step.run).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);

    expect(subscriptionsConnector.createSubscription).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const nextSkipToken = 'next-skip-token';
    const elba = spyOnElba();

    vi.spyOn(deltaConnector, 'getDeltaItems').mockResolvedValue({
      items: { updated: items, deleted: [] },
      nextSkipToken,
    });
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockImplementation(({ itemId }) =>
      Promise.resolve(itemPermissions.get(itemId) || [])
    );
    vi.spyOn(subscriptionsConnector, 'createSubscription').mockResolvedValue({
      clientState: 'client-state',
      expirationDateTime: '2024-01-01T00:00:00Z',
      id: 'subscription-id',
    });

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.run).toBeCalledTimes(3);
    expect(step.run).toHaveBeenNthCalledWith(1, 'get-items', expect.any(Function));
    expect(step.run).toHaveBeenNthCalledWith(2, 'get-permissions', expect.any(Function));
    expect(step.run).toHaveBeenNthCalledWith(3, 'update-elba-objects', expect.any(Function));

    expect(deltaConnector.getDeltaItems).toBeCalledTimes(1);
    expect(deltaConnector.getDeltaItems).toBeCalledWith({
      token,
      siteId,
      driveId,
      deltaToken: null,
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

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toHaveBeenNthCalledWith(1, 'sync-next-items-page', {
      name: 'sharepoint/items.sync.triggered',
      data: {
        driveId,
        isFirstSync,
        organisationId: organisation.id,
        siteId,
        skipToken: nextSkipToken,
      },
    });

    expect(subscriptionsConnector.createSubscription).toBeCalledTimes(0);
  });

  test('should finalize the sync when there is no next page', async () => {
    const elba = spyOnElba();

    vi.spyOn(deltaConnector, 'getDeltaItems').mockResolvedValue({
      items: { updated: items, deleted: [] },
      newDeltaToken: 'new-delta',
    });
    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockImplementation(({ itemId }) =>
      Promise.resolve(itemPermissions.get(itemId) || [])
    );
    vi.spyOn(subscriptionsConnector, 'createSubscription').mockResolvedValue({
      clientState: 'client-state',
      expirationDateTime: '2024-01-01T00:00:00Z',
      id: 'subscription-id',
    });

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.run).toBeCalledTimes(4);
    expect(step.run).toHaveBeenNthCalledWith(1, 'get-items', expect.any(Function));
    expect(step.run).toHaveBeenNthCalledWith(2, 'get-permissions', expect.any(Function));
    expect(step.run).toHaveBeenNthCalledWith(3, 'update-elba-objects', expect.any(Function));
    expect(step.run).toHaveBeenNthCalledWith(4, 'create-subscription', expect.any(Function));

    expect(deltaConnector.getDeltaItems).toBeCalledTimes(1);
    expect(deltaConnector.getDeltaItems).toBeCalledWith({
      token,
      siteId,
      driveId,
      deltaToken: null,
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

    expect(subscriptionsConnector.createSubscription).toBeCalledTimes(1);
    expect(subscriptionsConnector.createSubscription).toBeCalledWith({
      changeType: 'updated',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- convenience
      clientState: expect.any(String),
      resource: 'sites/some-site-id/drives/some-drive-id/root',
      token: 'test-token',
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toHaveBeenNthCalledWith(1, 'items-sync-completed', {
      name: 'sharepoint/items.sync.completed',
      data: {
        driveId,
        organisationId: organisation.id,
      },
    });
  });
});
