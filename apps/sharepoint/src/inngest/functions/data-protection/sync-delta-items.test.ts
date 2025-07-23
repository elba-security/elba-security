import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { and, eq } from 'drizzle-orm';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { env } from '@/common/env';
import type { SharepointPermission } from '@/connectors/microsoft/sharepoint/permissions';
import * as permissionsConnector from '@/connectors/microsoft/sharepoint/permissions';
import * as deltaConnector from '@/connectors/microsoft/delta/delta';
import { MicrosoftError } from '@/common/error';
import { syncDeltaItems } from './sync-delta-items';

const token = 'test-token';
const organisationId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c92';
const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const subscriptionId = 'some-subscription-id';
const clientState = 'random-client-state-string';
const tenantId = 'some-tenant-id';
const deltaToken = 'some-delta-token';

const organisation = {
  id: organisationId,
  token: await encrypt(token),
  tenantId,
  region: 'us',
};

const deltaItems: deltaConnector.ParsedDeltaItems = {
  deleted: ['item-id-5'],
  updated: [
    {
      id: 'item-id-1',
      name: 'item-name-1',
      parentReference: { id: 'root' },
      createdBy: { user: { id: 'user-id-1' } },
      lastModifiedDateTime: '2024-01-01T00:00:00Z',
      webUrl: 'https://sharepoint.local/item-1',
      shared: {},
    },
    {
      id: 'item-id-2',
      name: 'item-name-2',
      parentReference: { id: 'item-id-1' },
      createdBy: { user: { id: 'user-id-1' } },
      lastModifiedDateTime: '2024-01-01T00:00:00Z',
      webUrl: 'https://sharepoint.local/item-2',
      shared: {},
    },
    {
      id: 'item-id-3',
      name: 'item-name-3',
      parentReference: { id: 'item-id-2' },
      createdBy: { user: { id: 'user-id-1' } },
      lastModifiedDateTime: '2024-01-01T00:00:00Z',
      webUrl: 'https://sharepoint.local/item-3',
      shared: {},
    },
    {
      id: 'item-id-4',
      name: 'item-name-4',
      parentReference: { id: 'item-id-2' },
      createdBy: { user: { id: 'user-id-1' } },
      lastModifiedDateTime: '2024-01-01T00:00:00Z',
      webUrl: 'https://sharepoint.local/item-4',
      shared: {},
    },
    {
      id: 'item-id-6',
      name: 'item-name-6',
      parentReference: { id: 'root' },
      createdBy: { user: { id: 'user-id-1' } },
      lastModifiedDateTime: '2024-01-01T00:00:00Z',
      webUrl: 'https://sharepoint.local/item-6',
    },
  ],
};

const createPermission = (n: number): SharepointPermission[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `permission-id-${i + 1}`,
    link: { scope: 'anonymous' },
  }));

const itemPermissions = new Map([
  ['item-id-1', createPermission(1)],
  ['item-id-2', createPermission(2)],
  ['item-id-3', createPermission(3)],
  ['item-id-4', createPermission(2)],
  ['item-id-6', createPermission(3)],
]);

const subscription = {
  organisationId,
  siteId,
  driveId,
  subscriptionId,
  subscriptionClientState: clientState,
  subscriptionExpirationDate: '2024-04-25T00:00:00Z',
  delta: deltaToken,
};

const setupData = {
  siteId,
  driveId,
  subscriptionId,
  tenantId,
};

const setup = createInngestFunctionMock(syncDeltaItems, 'sharepoint/delta.sync.triggered');

describe('update-item-and-permissions', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
    await db
      .insert(subscriptionsTable)
      .values(subscription)
      .onConflictDoUpdate({
        target: [subscriptionsTable.organisationId, subscriptionsTable.driveId],
        set: {
          subscriptionId: subscription.subscriptionId,
          subscriptionExpirationDate: subscription.subscriptionExpirationDate,
          subscriptionClientState: subscription.subscriptionClientState,
          delta: subscription.delta,
        },
      });
  });

  test('should abort sync when there is no data in db', async () => {
    const elba = spyOnElba();

    vi.spyOn(deltaConnector, 'getDeltaItems').mockResolvedValue({
      items: { deleted: [], updated: [] },
      newDeltaToken: 'token',
    });

    const [result, { step }] = setup({
      ...setupData,
      tenantId: 'fake-tenant-id', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(deltaConnector.getDeltaItems).toBeCalledTimes(0);

    expect(elba).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should update and delete elba data protection objects', async () => {
    const elba = spyOnElba();

    vi.spyOn(deltaConnector, 'getDeltaItems').mockResolvedValue({
      items: deltaItems,
      newDeltaToken: 'new-delta-token',
    });

    vi.spyOn(permissionsConnector, 'getAllItemPermissions').mockImplementation(({ itemId }) =>
      Promise.resolve(itemPermissions.get(itemId) || [])
    );

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.run).toBeCalledTimes(4);
    expect(step.run).toHaveBeenNthCalledWith(1, 'fetch-delta-items', expect.any(Function));
    expect(step.run).toHaveBeenNthCalledWith(2, 'get-permissions', expect.any(Function));
    expect(step.run).toHaveBeenNthCalledWith(3, 'update-elba-objects', expect.any(Function));
    expect(step.run).toHaveBeenNthCalledWith(4, 'remove-elba-objects', expect.any(Function));

    expect(deltaConnector.getDeltaItems).toBeCalledTimes(1);
    expect(deltaConnector.getDeltaItems).toBeCalledWith({
      token,
      siteId,
      driveId,
      deltaToken,
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
          metadata: { driveId, siteId },
          name: 'item-name-1',
          ownerId: 'user-id-1',
          permissions: [
            {
              id: 'anyone',
              metadata: { permissionIds: ['permission-id-1'], type: 'anyone' },
              type: 'anyone',
            },
          ],
          updatedAt: '2024-01-01T00:00:00Z',
          url: 'https://sharepoint.local/item-1',
        },
        {
          id: 'item-id-2',
          metadata: { driveId, siteId },
          name: 'item-name-2',
          ownerId: 'user-id-1',
          permissions: [
            {
              id: 'anyone',
              metadata: { permissionIds: ['permission-id-2'], type: 'anyone' },
              type: 'anyone',
            },
          ],
          updatedAt: '2024-01-01T00:00:00Z',
          url: 'https://sharepoint.local/item-2',
        },
        {
          id: 'item-id-3',
          metadata: { driveId, siteId },
          name: 'item-name-3',
          ownerId: 'user-id-1',
          permissions: [
            {
              id: 'anyone',
              metadata: { permissionIds: ['permission-id-3'], type: 'anyone' },
              type: 'anyone',
            },
          ],
          updatedAt: '2024-01-01T00:00:00Z',
          url: 'https://sharepoint.local/item-3',
        },
      ],
    });

    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      ids: ['item-id-5', 'item-id-4', 'item-id-6'],
    });
  });

  test('should update delta token in db', async () => {
    const newDeltaToken = 'new-delta-token';
    vi.spyOn(deltaConnector, 'getDeltaItems').mockResolvedValue({
      items: { deleted: [], updated: [] },
      newDeltaToken,
    });

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.run).toBeCalledTimes(1);
    expect(step.run).toHaveBeenNthCalledWith(1, 'fetch-delta-items', expect.any(Function));

    const [record] = await db
      .select({
        delta: subscriptionsTable.delta,
      })
      .from(subscriptionsTable)
      .innerJoin(organisationsTable, eq(subscriptionsTable.organisationId, organisationsTable.id))
      .where(
        and(
          eq(organisationsTable.tenantId, tenantId),
          eq(subscriptionsTable.siteId, siteId),
          eq(subscriptionsTable.driveId, driveId),
          eq(subscriptionsTable.subscriptionId, subscriptionId)
        )
      );

    expect(record).toBeDefined();
    expect(record?.delta).toBe(newDeltaToken);
  });

  test('should start resync when delta token is expired', async () => {
    vi.spyOn(deltaConnector, 'getDeltaItems').mockRejectedValue(
      new MicrosoftError('Delta token expired', { code: 'DELTA_TOKEN_EXPIRED' })
    );
    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ ids: ['sync-next-delta-page-1'] });

    expect(step.run).toBeCalledTimes(1);
    expect(step.run).toHaveBeenNthCalledWith(1, 'fetch-delta-items', expect.any(Function));

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-next-delta-page', {
      name: 'sharepoint/delta.sync.triggered',
      data: {
        siteId,
        driveId,
        subscriptionId,
        tenantId,
      },
    });
  });

  test('should continue the sync when there is a next page', async () => {
    const nextSkipToken = 'next-skip-token';
    vi.spyOn(deltaConnector, 'getDeltaItems').mockResolvedValue({
      items: { deleted: [], updated: [] },
      nextSkipToken,
    });

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.run).toBeCalledTimes(1);
    expect(step.run).toHaveBeenNthCalledWith(1, 'fetch-delta-items', expect.any(Function));

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-next-delta-page', {
      name: 'sharepoint/delta.sync.triggered',
      data: {
        siteId,
        driveId,
        subscriptionId,
        tenantId,
      },
    });

    const [record] = await db
      .select({
        delta: subscriptionsTable.delta,
      })
      .from(subscriptionsTable)
      .innerJoin(organisationsTable, eq(subscriptionsTable.organisationId, organisationsTable.id))
      .where(
        and(
          eq(organisationsTable.tenantId, tenantId),
          eq(subscriptionsTable.siteId, siteId),
          eq(subscriptionsTable.driveId, driveId),
          eq(subscriptionsTable.subscriptionId, subscriptionId)
        )
      );

    expect(record).toBeDefined();
    expect(record?.delta).toBe(nextSkipToken);
  });
});
