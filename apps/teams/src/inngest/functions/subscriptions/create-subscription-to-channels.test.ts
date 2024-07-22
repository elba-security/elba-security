import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import * as subscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import { createSubscriptionToChannels } from '@/inngest/functions/subscriptions/create-subscription-to-channels';

const token = 'token';
const encryptedToken = await encrypt(token);

const changeType = 'created,deleted';
const resource = 'teams/getAllChannels';

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptedToken,
};

const subscription = {
  id: 'subscription-id',
  resource: 'teams/getAllChannels',
  changeType: 'created,deleted',
};

const data = {
  organisationId: organisation.id,
};

const setup = createInngestFunctionMock(
  createSubscriptionToChannels,
  'teams/channels.subscription.requested'
);

describe('create-subscription-to-channels', () => {
  test('should abort the subscription when the organisation is not registered', async () => {
    const [result] = setup(data);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should exit if the subscription exists in the db', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db
      .insert(subscriptionsTable)
      .values({ ...subscription, organisationId: organisation.id });

    const [result] = setup(data);

    await expect(result).resolves.toBeNull();
  });

  test('should exit if the subscription fail', async () => {
    await db.insert(organisationsTable).values(organisation);

    const createSubscription = vi
      .spyOn(subscriptionConnector, 'createSubscription')
      .mockResolvedValue(null);

    const [result] = setup(data);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(createSubscription).toBeCalledWith({
      encryptToken: organisation.token,
      changeType,
      resource,
    });
    expect(createSubscription).toBeCalledTimes(1);
  });

  test('should subscribe when the organization is registered and the subscription has not yet been added to the database.', async () => {
    await db.insert(organisationsTable).values(organisation);
    const createSubscription = vi
      .spyOn(subscriptionConnector, 'createSubscription')
      .mockResolvedValue(subscription);
    const [result] = setup(data);

    await expect(result).resolves.toBeUndefined();

    expect(createSubscription).toBeCalledWith({
      encryptToken: organisation.token,
      changeType,
      resource,
    });
    expect(createSubscription).toBeCalledTimes(1);
  });
});
