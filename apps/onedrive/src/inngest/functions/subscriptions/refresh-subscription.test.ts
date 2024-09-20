import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import * as refreshSubscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import { refreshSubscription } from './refresh-subscription';

const token = 'test-token';
const organisationId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';
const userId = 'some-user-id';
const subscriptionId = 'some-subscription-id';
const tenantId = 'some-tenant-id';
const deltaToken = 'some-delta-token';
const clientState = 'some-client-state';

const organisation = {
  id: organisationId,
  token: await encrypt(token),
  tenantId,
  region: 'us',
};

const databaseSubscription = {
  organisationId,
  userId,
  subscriptionId,
  subscriptionExpirationDate: '2024-04-25 00:00:00.000000',
  subscriptionClientState: clientState,
  delta: deltaToken,
};

const setupData = {
  subscriptionId: databaseSubscription.subscriptionId,
  organisationId: organisation.id,
};

const subscription = {
  id: subscriptionId,
  clientState,
  expirationDateTime: databaseSubscription.subscriptionExpirationDate,
};

const setup = createInngestFunctionMock(
  refreshSubscription,
  'onedrive/subscriptions.refresh.triggered'
);

describe('refresh-subscription', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
    await db
      .insert(subscriptionsTable)
      .values(databaseSubscription)
      .onConflictDoUpdate({
        target: [subscriptionsTable.organisationId, subscriptionsTable.userId],

        set: {
          subscriptionId: databaseSubscription.subscriptionId,
          subscriptionExpirationDate: databaseSubscription.subscriptionExpirationDate,
          subscriptionClientState: databaseSubscription.subscriptionClientState,
          delta: databaseSubscription.delta,
        },
      });
  });

  test('should abort refreshing when record not found', async () => {
    vi.spyOn(refreshSubscriptionConnector, 'refreshSubscription').mockResolvedValue(subscription);

    const [result] = setup({
      ...setupData,
      organisationId: '15a76301-f1dd-4a77-b12a-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(refreshSubscriptionConnector.refreshSubscription).toBeCalledTimes(0);
  });

  test('should run refreshSubscription when data is valid', async () => {
    vi.spyOn(refreshSubscriptionConnector, 'refreshSubscription').mockResolvedValue(subscription);

    const [result] = setup(setupData);

    await expect(result).resolves.toBeUndefined();

    expect(refreshSubscriptionConnector.refreshSubscription).toBeCalledTimes(1);
    expect(refreshSubscriptionConnector.refreshSubscription).toBeCalledWith({
      subscriptionId: 'some-subscription-id',
      token: 'test-token',
    });
  });
});
