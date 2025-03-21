import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema'; // oneDriveTable
import { env } from '@/common/env';
import { encrypt } from '@/common/crypto';
import { removeOrganisation } from './remove-organisation';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt('test-token'),
  tenantId: 'tenant-id',
  region: 'us',
};

const oneDrives = Array.from({ length: 5 }, (_, i) => ({
  organisationId: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  userId: `user-id-${i}`,
  subscriptionId: `subscription-id-${i}`,
  subscriptionClientState: `some-random-client-state-${i}`,
  subscriptionExpirationDate: `2024-04-25 00:00:0${i}.000000`,
  delta: `delta-token-${i}`,
}));

const setup = createInngestFunctionMock(removeOrganisation, 'onedrive/app.uninstalled');

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
    await db.insert(subscriptionsTable).values(oneDrives);

    const [result, { step }] = setup({ organisationId: organisation.id });

    await expect(result).resolves.toBeUndefined();

    expect(step.waitForEvent).toBeCalledTimes(oneDrives.length);

    for (const [i, subscription] of oneDrives.entries()) {
      expect(step.waitForEvent).nthCalledWith(
        i + 1,
        `wait-for-remove-subscription-complete-${subscription.subscriptionId}`,
        {
          event: 'onedrive/subscriptions.remove.completed',
          timeout: '30d',
          if: `async.data.organisationId == '${subscription.organisationId}' && async.data.subscriptionId == '${subscription.subscriptionId}'`,
        }
      );
    }

    expect(step.sendEvent).toHaveBeenCalledTimes(1);
    expect(step.sendEvent).toHaveBeenCalledWith(
      'subscription-remove-triggered',
      oneDrives.map(({ organisationId, subscriptionId }) => ({
        name: 'onedrive/subscriptions.remove.triggered',
        data: {
          organisationId,
          subscriptionId,
        },
      }))
    );

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
      errorType: 'unauthorized',
    });

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);
  });
});
