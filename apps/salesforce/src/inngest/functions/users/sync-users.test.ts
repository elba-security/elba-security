import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/salesforce/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as nangoAPI from '@/common/nango/api';
import { syncUsers } from './sync-users';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  region: 'us',
};

const syncStartedAt = Date.now();
const syncedBefore = Date.now();
const accessToken = 'test-access-token';
const instanceUrl = 'https://test-some-url.com';
const nextPage = 1;
const users: usersConnector.SalesforceUser[] = Array.from({ length: 2 }, (_, i) => ({
  Id: `id-${i}`,
  Name: `name-${i}`,
  Email: `user-${i}@foo.bar`,
  IsActive: true,
  UserType: 'Standard',
  Profile: { Id: `role-id-${i}`, Name: `role-name-${i}` },
}));

const user = {
  userId: 'test-auth-user-id',
};

const setup = createInngestFunctionMock(syncUsers, 'salesforce/users.sync.requested');

describe('sync-users', () => {
  beforeEach(() => {
    const mockNangoAPIClient = {
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: accessToken,
          raw: {
            instance_url: instanceUrl,
          },
        },
      }),
    };

    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue(
      mockNangoAPIClient as unknown as typeof nangoAPI.nangoAPIClient
    );
  });
  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: Date.now(),
      page: 0,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getUsers).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const elba = spyOnElba();
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue(user);

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
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users', {
      name: 'salesforce/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: nextPage,
      },
    });

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'name-0',
          email: 'user-0@foo.bar',
          id: 'id-0',
          role: 'role-name-0',
          isSuspendable: true,
          url: 'https://test-some-url.com/lightning/r/User/id-0/view',
        },
        {
          additionalEmails: [],
          displayName: 'name-1',
          email: 'user-1@foo.bar',
          id: 'id-1',
          role: 'role-name-1',
          isSuspendable: true,
          url: 'https://test-some-url.com/lightning/r/User/id-1/view',
        },
      ],
    });
    expect(elbaInstance?.users.delete).not.toBeCalled();
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue(user);

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
          id: 'id-0',
          role: 'role-name-0',
          isSuspendable: true,
          url: 'https://test-some-url.com/lightning/r/User/id-0/view',
        },
        {
          additionalEmails: [],
          displayName: 'name-1',
          email: 'user-1@foo.bar',
          id: 'id-1',
          role: 'role-name-1',
          isSuspendable: true,
          url: 'https://test-some-url.com/lightning/r/User/id-1/view',
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncedBefore).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ syncedBefore: syncBeforeAtISO });
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
