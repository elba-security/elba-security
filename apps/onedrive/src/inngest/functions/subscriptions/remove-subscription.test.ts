import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as removeSubscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { removeSubscription } from './remove-subscription';

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

const subscription = {
  organisationId,
  userId,
  subscriptionId,
  subscriptionExpirationDate: '2024-04-25 00:00:00.000000',
  subscriptionClientState: clientState,
  delta: deltaToken,
};

const setup = createInngestFunctionMock(
  removeSubscription,
  'onedrive/subscriptions.remove.triggered'
);

describe('remove-subscription', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should stop and send completed event when there is no subscription left', async () => {
    vi.spyOn(removeSubscriptionConnector, 'removeSubscription').mockResolvedValue(undefined);

    const [result, { step }] = setup({ organisationId });

    await expect(result).resolves.toEqual({ status: 'completed' });

    expect(removeSubscriptionConnector.removeSubscription).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toHaveBeenCalledWith('remove-subscription-completed', {
      data: { organisationId },
      name: 'onedrive/subscriptions.remove.completed',
    });
  });

  test('should delete subscription and trigger next job when there are subscriptions', async () => {
    await db
      .insert(subscriptionsTable)
      .values(subscription)
      .onConflictDoUpdate({
        target: [subscriptionsTable.organisationId, subscriptionsTable.userId],
        set: {
          subscriptionId: subscription.subscriptionId,
          subscriptionExpirationDate: subscription.subscriptionExpirationDate,
          subscriptionClientState: subscription.subscriptionClientState,
          delta: subscription.delta,
        },
      });

    vi.spyOn(removeSubscriptionConnector, 'removeSubscription').mockResolvedValue(undefined);

    const [result, { step }] = setup({ organisationId });

    await expect(result).resolves.toEqual({ status: 'ongoing' });

    expect(removeSubscriptionConnector.removeSubscription).toBeCalledTimes(1);
    expect(removeSubscriptionConnector.removeSubscription).toBeCalledWith({
      subscriptionId,
      token,
    });

    const subscriptions = await db
      .select({ subscriptionId: subscriptionsTable.subscriptionId })
      .from(subscriptionsTable);
    expect(subscriptions.length).toStrictEqual(0);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('remove-organisation-subscriptions', {
      data: { organisationId },
      name: 'onedrive/subscriptions.remove.triggered',
    });
  });
});
