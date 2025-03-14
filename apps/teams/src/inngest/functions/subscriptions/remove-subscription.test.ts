import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as removeSubscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { removeSubscription } from './remove-subscription';

const token = 'test-token';
const organisationId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';
const subscriptionId = 'some-subscription-id';
const tenantId = 'some-tenant-id';
const resource = 'some-resource';
const changeType = 'some-change-type';

const encryptedToken = await encrypt(token);

const organisation = {
  id: organisationId,
  token: encryptedToken,
  tenantId,
  region: 'us',
};

const subscription = {
  organisationId,
  id: subscriptionId,
  resource,
  changeType,
};

const setup = createInngestFunctionMock(removeSubscription, 'teams/subscriptions.remove.triggered');

describe('remove-subscription', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
  });

  test('should stop and send completed event when there is no subscription left', async () => {
    vi.spyOn(removeSubscriptionConnector, 'deleteSubscription').mockResolvedValue(null);

    const [result, { step }] = setup({ organisationId });

    await expect(result).resolves.toEqual({ status: 'completed' });

    expect(removeSubscriptionConnector.deleteSubscription).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toHaveBeenCalledWith('remove-subscription-completed', {
      data: { organisationId },
      name: 'teams/subscriptions.remove.completed',
    });
  });

  test('should delete subscription and trigger next job when there are subscriptions', async () => {
    await db
      .insert(subscriptionsTable)
      .values(subscription)
      .onConflictDoUpdate({
        target: [subscriptionsTable.id],

        set: {
          organisationId: subscription.organisationId,
          changeType: subscription.changeType,
          resource: subscription.resource,
        },
      });

    vi.spyOn(removeSubscriptionConnector, 'deleteSubscription').mockResolvedValue(null);

    const [result, { step }] = setup({ organisationId });

    await expect(result).resolves.toEqual({ status: 'ongoing' });

    expect(removeSubscriptionConnector.deleteSubscription).toBeCalledTimes(1);
    expect(removeSubscriptionConnector.deleteSubscription).toBeCalledWith(
      encryptedToken,
      subscriptionId
    );

    const subscriptions = await db.select({ id: subscriptionsTable.id }).from(subscriptionsTable);
    expect(subscriptions.length).toStrictEqual(0);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('remove-organisation-subscriptions', {
      data: { organisationId },
      name: 'teams/subscriptions.remove.triggered',
    });
  });
});
