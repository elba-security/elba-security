import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/apollo/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { synchronizeUsers } from './sync-users';

const nextPage = 2;
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  apiKey: 'test-api-key',
  region: 'us',
};

const users: usersConnector.ApolloUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
  deleted: false,
}));

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(synchronizeUsers, 'apollo/users.sync.requested');

describe('sync-users', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'decrypt').mockResolvedValueOnce('test-api-key');
    vi.clearAllMocks;
  });

  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: 1,
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
          displayName: 'name-0',
          email: 'user-0@foo.bar',
          id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
          url: 'https://app.apollo.io/#/users/45a76301-f1dd-4a77-b12f-9d7d3fca3c90/edit',
        },
        {
          additionalEmails: [],
          displayName: 'name-1',
          email: 'user-1@foo.bar',
          id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c91',
          url: 'https://app.apollo.io/#/users/45a76301-f1dd-4a77-b12f-9d7d3fca3c91/edit',
        },
      ],
    });
    // check that the function deletes users that were synced before
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'apollo/users.sync.requested',
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
      page: 1,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'name-0',
          email: 'user-0@foo.bar',
          id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
          url: 'https://app.apollo.io/#/users/45a76301-f1dd-4a77-b12f-9d7d3fca3c90/edit',
        },
        {
          additionalEmails: [],
          displayName: 'name-1',
          email: 'user-1@foo.bar',
          id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c91',
          url: 'https://app.apollo.io/#/users/45a76301-f1dd-4a77-b12f-9d7d3fca3c91/edit',
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
