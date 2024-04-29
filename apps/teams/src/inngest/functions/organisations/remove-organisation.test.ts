import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { env } from '@/env';
import { encrypt } from '@/common/crypto';
import * as subscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import { removeOrganisation } from './remove-organisation';

const token = 'token';
const encryptedToken = await encrypt(token);

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'us',
  token: encryptedToken,
};

const subscriptionsArray = Array.from({ length: 5 }, (_, i) => ({
  id: `subscription-id-${i}`,
  organisationId: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  resource: `teams/team-id-${i}/channels/channel-id-${i}`,
  changeType: 'created,updated,deleted',
}));

const selectSubscriptions = Array.from({ length: 5 }, (_, i) => ({
  subscriptionId: `subscription-id-${i}`,
}));

const setup = createInngestFunctionMock(removeOrganisation, 'teams/app.uninstalled');

describe('remove-organisation', () => {
  test("should not remove given organisation when it's not registered", async () => {
    const elba = spyOnElba();
    const [result] = setup({ organisationId: organisation.id });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(elba).toBeCalledTimes(0);
  });

  test("should remove given organisation when it's registered", async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    await db.insert(subscriptionsTable).values(subscriptionsArray);

    const deleteSubscription = vi
      .spyOn(subscriptionConnector, 'deleteSubscription')
      // @ts-expect-error -- this is a mock
      .mockResolvedValue(undefined);

    const [result] = setup({ organisationId: organisation.id });

    await expect(result).resolves.toBeUndefined();

    selectSubscriptions.forEach((subscription) => {
      expect(deleteSubscription).toBeCalledWith(organisation.token, subscription.subscriptionId);
    });
    expect(deleteSubscription).toBeCalledTimes(5);
    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      hasError: true,
    });

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);
  });
});
