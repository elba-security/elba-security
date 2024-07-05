import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { and, eq } from 'drizzle-orm';
import * as deltaConnector from '@/connectors/microsoft/delta/delta';
import * as createSubscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import type { Subscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { createSubscription } from '../subscriptions/create-subscription';
import { initializeDelta } from './initialize-delta';

const token = 'test-token';
const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const deltaToken = 'some-delta-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt(token),
  tenantId: 'tenant-id',
  region: 'us',
};

const subscriptionData: Subscription = {
  id: 'somesubscription-id',
  clientState: 'some-random-client-state',
  expirationDateTime: '2023-10-24 14:40:00.000000+03',
};

const setupData = {
  organisationId: organisation.id,
  siteId,
  driveId,
  isFirstSync: true,
  skipToken: null,
};

const setup = createInngestFunctionMock(initializeDelta, 'sharepoint/delta.initialize.requested');

describe('sync-sites', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(deltaConnector, 'getDeltaItems').mockResolvedValue({
      items: { deleted: [], updated: [] },
      newDeltaToken: 'new-delta-token',
    });

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '15a76301-f1dd-4a77-b12a-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(deltaConnector.getDeltaItems).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should finalize the sync and insert/update data in db', async () => {
    vi.spyOn(deltaConnector, 'getDeltaItems').mockResolvedValue({
      items: { deleted: [], updated: [] },
      newDeltaToken: deltaToken,
    });
    vi.spyOn(createSubscriptionConnector, 'createSubscription').mockResolvedValue(subscriptionData);

    const [result, { step }] = setup(setupData);
    step.invoke.mockResolvedValue(subscriptionData);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('create-subscription', {
      function: createSubscription,
      data: {
        organisationId: organisation.id,
        siteId,
        driveId,
        isFirstSync: true,
      },
    });

    const [record] = await db
      .select({
        subscriptionId: subscriptionsTable.subscriptionId,
        subscriptionExpirationDate: subscriptionsTable.subscriptionExpirationDate,
        delta: subscriptionsTable.delta,
      })
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.organisationId, organisation.id),
          eq(subscriptionsTable.siteId, siteId),
          eq(subscriptionsTable.driveId, driveId)
        )
      );

    expect(record).toBeDefined();
    expect(record?.subscriptionId).toBe(subscriptionData.id);
    expect(record?.subscriptionExpirationDate).toBe(subscriptionData.expirationDateTime);
    expect(record?.delta).toBe(deltaToken);
  });
});
