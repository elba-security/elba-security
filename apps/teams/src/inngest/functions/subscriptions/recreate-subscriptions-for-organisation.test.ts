import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { encrypt } from '@/common/crypto';
import * as subscriptionsConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { db } from '@/database/client';
import { recreateSubscriptionsForOrganisation } from './recreate-subscriptions-for-organisation';

const subscriptionResource =
  Math.random() > 0.5 ? 'teams/getAllChannels' : 'teams/team-id-1/channels/channel-id-1/messages';

const token = 'token';
const encryptToken = await encrypt(token);

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptToken,
};

const invalidOrganisationId = '98449620-9738-4a9c-8db0-1e4ef5a6a1e0';

const subscriptions = [
  {
    id: '98449620-9738-4a9c-8db0-1e4ef5a6a1e8',
    resource: subscriptionResource,
    changeType: 'created,updated,deleted',
    organisationId: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  },
];

const createdSubscription = {
  id: '18449620-9738-4a9c-8db0-1e4ef5a6a1e8',
  resource: subscriptionResource,
  changeType: 'created,updated,deleted',
};

const setup = createInngestFunctionMock(
  recreateSubscriptionsForOrganisation,
  'teams/subscriptions.recreate.requested'
);

describe('reconnectSubscriptions', () => {
  test('should abort the subscription when the organisation is not registered', async () => {
    const [result] = setup({ organisationId: invalidOrganisationId });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should not insert invalid subscriptions', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(subscriptionsTable).values(subscriptions);

    const deleteSubscription = vi
      .spyOn(subscriptionsConnector, 'deleteSubscription')
      .mockResolvedValue({ message: 'subscription has been deleted' });

    const createSubscription = vi
      .spyOn(subscriptionsConnector, 'createSubscription')
      .mockResolvedValue(null);

    const [result] = setup({ organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual({
      message: 'There are no subscriptions to save to the database.',
    });

    subscriptions.forEach(({ id }, i) => {
      expect(deleteSubscription).toHaveBeenNthCalledWith(i + 1, encryptToken, id);
    });
    expect(deleteSubscription).toBeCalledTimes(subscriptions.length);

    subscriptions.forEach(({ resource, changeType }, i) => {
      expect(createSubscription).toHaveBeenNthCalledWith(i + 1, {
        encryptToken,
        resource,
        changeType,
      });
    });
    expect(createSubscription).toBeCalledTimes(subscriptions.length);
  });

  test('should create new subscriptions if the old subscriptions received', async () => {
    await db.insert(organisationsTable).values(organisation);
    await db.insert(subscriptionsTable).values(subscriptions);

    const deleteSubscription = vi
      .spyOn(subscriptionsConnector, 'deleteSubscription')
      .mockResolvedValue({ message: 'subscription has been deleted' });

    const createSubscription = vi
      .spyOn(subscriptionsConnector, 'createSubscription')
      .mockResolvedValue(createdSubscription);

    const [result] = setup({ organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual({
      message: 'Subscriptions successfully recreated',
    });

    subscriptions.forEach(({ id }, i) => {
      expect(deleteSubscription).toHaveBeenNthCalledWith(i + 1, encryptToken, id);
    });
    expect(deleteSubscription).toBeCalledTimes(subscriptions.length);

    subscriptions.forEach(({ resource, changeType }, i) => {
      expect(createSubscription).toHaveBeenNthCalledWith(i + 1, {
        encryptToken,
        resource,
        changeType,
      });
    });
    expect(createSubscription).toBeCalledTimes(subscriptions.length);
  });
});
