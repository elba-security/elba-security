import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/jumpcloud/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { synchronizeUsers } from './sync-users';

const nextPage = 1;
const role = 'admin';
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  apiKey: 'test-api-key',
  region: 'us',
};

const users: usersConnector.JumpcloudUser[] = Array.from({ length: 2 }, (_, i) => ({
  _id: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${i}`,
  firstname: `firstname-${i}`,
  lastname: `lastname-${i}`,
  suspended: false,
  email: `user-${i}@foo.bar`,
  enableMultiFactor: false,
}));

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(synchronizeUsers, 'jumpcloud/users.sync.requested');

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
      page: 0,
      role,
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
      role,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });
    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'firstname-0 lastname-0',
          email: 'user-0@foo.bar',
          id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
          role: 'admin',
          authMethod: 'password',
          url: 'https://console.jumpcloud.com/#/settings/administrators/details/45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
        },
        {
          additionalEmails: [],
          displayName: 'firstname-1 lastname-1',
          email: 'user-1@foo.bar',
          id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c91',
          role: 'admin',
          authMethod: 'password',
          url: 'https://console.jumpcloud.com/#/settings/administrators/details/45a76301-f1dd-4a77-b12f-9d7d3fca3c91',
        },
      ],
    });
    // check that the function deletes users that were synced before
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'jumpcloud/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: nextPage,
        role,
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
      page: 0,
      role: 'member',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'firstname-0 lastname-0',
          email: 'user-0@foo.bar',
          id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
          role: 'member',
          authMethod: 'password',
          url: 'https://console.jumpcloud.com/#/users/45a76301-f1dd-4a77-b12f-9d7d3fca3c90/details',
        },
        {
          additionalEmails: [],
          displayName: 'firstname-1 lastname-1',
          email: 'user-1@foo.bar',
          id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c91',
          role: 'member',
          authMethod: 'password',
          url: 'https://console.jumpcloud.com/#/users/45a76301-f1dd-4a77-b12f-9d7d3fca3c91/details',
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
