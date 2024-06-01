import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as accountsConnector from '@/connectors/harvest/auth';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { syncUsers } from './sync-users';
import { syncAccountUsers } from './sync-account-users';

// Mock organization data
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt('test-access-token'),
  refreshToken: await encrypt('test-refresh-token'),
  region: 'us',
};

const accessToken = 'test-access-token';
const accountIds = Array.from({ length: 10 }, (_, i) => `accountId-${i}`);
const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsers, 'harvest/users.sync.requested');

describe('synchronize-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(accountsConnector, 'getAccountIds').mockResolvedValue(accountIds);

    const [result, { step }] = setup({
      organisationId: organisation.id,
      syncStartedAt,
      isFirstSync: true,
      cursor: null,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(accountsConnector.getAccountIds).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
    expect(step.invoke).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should sync users and finalize the sync', async () => {
    const elba = spyOnElba();

    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(accountsConnector, 'getAccountIds').mockResolvedValue(accountIds);

    const [result, { step }] = setup({
      organisationId: organisation.id,
      syncStartedAt,
      isFirstSync: true,
      cursor: null,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(
      step.run('list-account-ids', async () =>
        accountsConnector.getAccountIds({
          accessToken,
        })
      )
    ).resolves.toEqual(accountIds);

    expect(accountsConnector.getAccountIds).toBeCalledTimes(1);
    expect(accountsConnector.getAccountIds).toBeCalledWith({
      accessToken,
    });

    // Verify step.invoke is called 10 times for each account with correct parameters
    await Promise.all(
      accountIds.map(async (accountId, i) => {
        await step.invoke(`sync-account-users-${accountId}`, {
          function: syncAccountUsers,
          data: {
            isFirstSync: true,
            cursor: null,
            organisationId: organisation.id,
            accountId,
          },
          timeout: '0.5d',
        });

        // Check if the function is called with correct arguments
        expect(step.invoke).toHaveBeenNthCalledWith(i + 1, `sync-account-users-${accountId}`, {
          function: syncAccountUsers,
          data: {
            isFirstSync: true,
            cursor: null,
            organisationId: organisation.id,
            accountId,
          },
          timeout: '0.5d',
        });
      })
    );

    expect(step.invoke).toBeCalledTimes(10);

    // Ensure finalization step runs correctly
    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(elba).toBeCalledTimes(1);
    const elbaInstance = elba.mock.results[0]?.value;

    // Verify users.delete called correctly
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });
});
