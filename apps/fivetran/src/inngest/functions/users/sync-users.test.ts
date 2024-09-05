import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/fivetran/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { synchronizeUsers } from './sync-users';

const nextPage = '1';
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  apiKey: 'test-api-key',
  apiSecret: 'test-api-secret',
  region: 'us',
  ownerId: 'test-owner-id',
};

const users: usersConnector.FivetranUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `${i}`,
  role: `Account Administrator`,
  given_name: `given_name-${i}`,
  family_name: `family_name-${i}`,
  email: `user-${i}@foo.bar`,
  active: true,
  invited: false,
}));

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(synchronizeUsers, 'fivetran/users.sync.requested');

describe('sync-users', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'decrypt')
      .mockResolvedValueOnce('test-api-key')
      .mockResolvedValueOnce('test-api-secret');
    vi.clearAllMocks;
  });

  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when the organization is registered', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: nextPage,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'given_name-0 family_name-0',
          email: 'user-0@foo.bar',
          id: '0',
          role: 'Account Administrator',
          isSuspendable: true,
          url: 'https://fivetran.com/dashboard/account/users-permissions/users/0/destinations',
        },
        {
          additionalEmails: [],
          displayName: 'given_name-1 family_name-1',
          email: 'user-1@foo.bar',
          id: '1',
          role: 'Account Administrator',
          url: 'https://fivetran.com/dashboard/account/users-permissions/users/1/destinations',
          isSuspendable: true,
        },
      ],
    });
    // check that the function deletes users that were synced before
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'fivetran/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: nextPage,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'given_name-0 family_name-0',
          email: 'user-0@foo.bar',
          id: '0',
          role: 'Account Administrator',
          isSuspendable: true,
          url: 'https://fivetran.com/dashboard/account/users-permissions/users/0/destinations',
        },
        {
          additionalEmails: [],
          displayName: 'given_name-1 family_name-1',
          email: 'user-1@foo.bar',
          id: '1',
          role: 'Account Administrator',
          isSuspendable: true,
          url: 'https://fivetran.com/dashboard/account/users-permissions/users/1/destinations',
        },
      ],
    });

    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
