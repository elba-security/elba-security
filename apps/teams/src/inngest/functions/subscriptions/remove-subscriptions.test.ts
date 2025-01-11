import { createInngestFunctionMock } from '@elba-security/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { inArray } from 'drizzle-orm';
import { encrypt } from '@/common/crypto';
import * as subscriptionsConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { db } from '@/database/client';
import { removeSubscriptions } from './remove-subscriptions';

const token = 'token';
const encryptToken = await encrypt(token);
const subscriptions = [
  {
    id: 'sub1',
    resource: 'channel',
    changeType: 'create',
  },
  {
    id: 'sub2',
    resource: 'channel',
    changeType: 'create',
  },
  {
    id: 'sub3',
    resource: 'channel',
    changeType: 'create',
  },
  {
    id: 'sub4',
    resource: 'channel',
    changeType: 'create',
  },
];

const organisation = {
  id: '98449620-9738-4a9c-8db0-1e4ef5a6a9e8',
  tenantId: 'tenant-id',
  region: 'US',
  token: encryptToken,
};

const setup = createInngestFunctionMock(
  removeSubscriptions,
  'teams/subscriptions.remove.requested'
);

describe('removeSubscriptions', () => {
  beforeEach(async () => {
    await db.delete(subscriptionsTable);
  });

  test('should abort removing subscriptions when there is no organization with given tenant', async () => {
    const [result] = setup({ tenantId: 'tenant-id', skipToken: null });
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });

  test.each([
    {
      case: "finish as it's last page",
      output: 'Subscriptions successfully deleted for tenant',
      nextSkipToken: null,
    },
    {
      case: 'start processing next page',
      output: 'Subscriptions successfully deleted on this page, starting processing new page',
      nextSkipToken: 'skip-token',
    },
  ])(
    'should remove subscriptions from current page for given tenant and $case',
    async ({ nextSkipToken, output }) => {
      await db.insert(organisationsTable).values(organisation);
      await db.insert(subscriptionsTable).values(
        subscriptions.map((subscription) => ({
          ...subscription,
          tenantId: organisation.tenantId,
        }))
      );

      const getSubscriptions = vi
        .spyOn(subscriptionsConnector, 'getSubscriptions')
        .mockResolvedValue({
          subscriptions,
          nextSkipToken,
        });
      const deleteSubscription = vi
        .spyOn(subscriptionsConnector, 'deleteSubscription')
        .mockResolvedValue({
          message: 'subscription has been deleted',
        });

      const [result, { step }] = setup({ tenantId: 'tenant-id', skipToken: null });

      await expect(result).resolves.toBe(output);

      expect(getSubscriptions).toBeCalledTimes(1);
      expect(getSubscriptions).toBeCalledWith(organisation.token, null);

      subscriptions.forEach((subscription) => {
        expect(deleteSubscription).toBeCalledWith(organisation.token, subscription.id);
      });
      expect(deleteSubscription).toBeCalledTimes(subscriptions.length);

      await expect(
        db
          .select({ id: subscriptionsTable.id })
          .from(subscriptionsTable)
          .where(
            inArray(
              subscriptionsTable.id,
              subscriptions.map(({ id }) => id)
            )
          )
      ).resolves.toHaveLength(0);

      expect(step.sendEvent).toBeCalledTimes(nextSkipToken ? 1 : 0);

      if (nextSkipToken) {
        expect(step.sendEvent).toBeCalledWith('teams-remove-subscriptions-next-page', {
          name: 'teams/subscriptions.remove.requested',
          data: {
            tenantId: organisation.tenantId,
            skipToken: nextSkipToken,
          },
        });
      }
    }
  );
});
