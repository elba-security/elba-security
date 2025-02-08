import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import * as subscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import { createSubscriptionToChannelMessages } from '@/inngest/functions/subscriptions/create-subscription-to-channel-messages';

const token = 'token';
const encryptedToken = await encrypt(token);

const changeType = 'created,updated,deleted';
const resource = 'teams/team-id/channels/channel-id/messages';

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptedToken,
};

const subscription = {
  id: 'subscription-id',
  resource: 'teams/team-id/channels/channel-id/messages',
  changeType: 'created,updated,deleted',
};

const data = {
  organisationId: organisation.id,
  teamId: 'team-id',
  channelId: 'channel-id',
  tenantId: 'tenant-id',
};

const setup = createInngestFunctionMock(
  createSubscriptionToChannelMessages,
  'teams/channel.subscription.requested'
);

describe('subscription-to-channel-message', () => {
  beforeEach(async () => {
    await db.delete(subscriptionsTable);
  });

  test('should abort the subscription when the organisation is not registered', async () => {
    const [result] = setup(data);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should exit if the subscription exists in the db', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db
      .insert(subscriptionsTable)
      .values({ ...subscription, tenantId: organisation.tenantId });

    const [result] = setup(data);

    await expect(result).resolves.toBe(
      `Subscription for resource - teams/${data.teamId}/channels/${data.channelId}/messages in tenant - ${organisation.tenantId} already exists`
    );
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

    await expect(result).resolves.toBe(
      `Subscription successfully created for resource - teams/${data.teamId}/channels/${data.channelId}/messages in tenant - ${organisation.tenantId}`
    );

    expect(createSubscription).toBeCalledWith({
      encryptToken: organisation.token,
      changeType,
      resource,
    });
    expect(createSubscription).toBeCalledTimes(1);
  });
});
