import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { encrypt } from '@/common/crypto';
import { subscriptionRefresh } from '@/inngest/functions/subscriptions/subscription-refresh';
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
  subscriptionRefresh,
  'teams/subscription.refresh.triggered'
);

describe('subscription-refresh', () => {
  test('should abort refresh when the organisation is not registered', async () => {
    const [result] = setup(data);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test('should refresh subscription when the organisation is registered', async () => {
    await db.insert(organisationsTable).values(organisation);
    const refreshSubscription = vi
      .spyOn(subscriptionConnector, 'refreshSubscription')
      // @ts-expect-error -- this is a mock
      .mockResolvedValue(undefined);
    const [result] = setup(data);

    await expect(result).resolves.toBeUndefined();

    expect(refreshSubscription).toBeCalledWith(organisation.token, data.subscriptionId);
    expect(refreshSubscription).toBeCalledTimes(1);
  });
});
