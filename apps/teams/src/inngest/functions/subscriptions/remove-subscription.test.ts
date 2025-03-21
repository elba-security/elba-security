import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
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

const setupData = {
  subscriptionId: subscription.id,
  organisationId: organisation.id,
};

const setup = createInngestFunctionMock(removeSubscription, 'teams/subscriptions.remove.triggered');

describe('remove-subscription', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
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
  });

  test('should abort removing when record not found', async () => {
    vi.spyOn(removeSubscriptionConnector, 'deleteSubscription').mockResolvedValue(null);

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '15a76301-f1dd-4a77-b12a-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(removeSubscriptionConnector.deleteSubscription).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should run removeSubscription when data is valid', async () => {
    vi.spyOn(removeSubscriptionConnector, 'deleteSubscription').mockResolvedValue(null);

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toBeUndefined();

    expect(removeSubscriptionConnector.deleteSubscription).toBeCalledTimes(1);
    expect(removeSubscriptionConnector.deleteSubscription).toBeCalledWith(
      encryptedToken,
      subscriptionId
    );

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('remove-subscription-completed', {
      name: 'teams/subscriptions.remove.completed',
      data: {
        subscriptionId,
        organisationId,
      },
    });
  });
});
