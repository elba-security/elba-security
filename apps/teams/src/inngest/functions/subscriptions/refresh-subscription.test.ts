import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { encrypt } from '@/common/crypto';
import { refreshSubscription } from '@/inngest/functions/subscriptions/refresh-subscription';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as subscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';

const token = 'token';
const encryptedToken = await encrypt(token);
const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptedToken,
};

const data = {
  subscriptionId: 'subscription-id',
  organisationId: organisation.id,
};

const setup = createInngestFunctionMock(
  refreshSubscription,
  'teams/subscription.refresh.requested'
);

describe('refresh-subscription', () => {
  test('should abort refresh when the organisation is not registered', async () => {
    const [result] = setup(data);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should refresh subscription when the organisation is registered', async () => {
    await db.insert(organisationsTable).values(organisation);
    const refreshSubscriptionMock = vi
      .spyOn(subscriptionConnector, 'refreshSubscription')
      // @ts-expect-error -- this is a mock
      .mockResolvedValue(undefined);
    const [result] = setup(data);

    await expect(result).resolves.toBeUndefined();

    expect(refreshSubscriptionMock).toBeCalledWith(organisation.token, data.subscriptionId);
    expect(refreshSubscriptionMock).toBeCalledTimes(1);
  });
});
