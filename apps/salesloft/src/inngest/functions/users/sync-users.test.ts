import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/salesloft/users';
import * as authConnector from '@/connectors/salesloft/auth';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as nangoAPI from '@/common/nango/api';
import { syncUsers } from './sync-users';

const syncStartedAt = Date.now();
const syncedBefore = Date.now();
const nextPage = '1';
const accessToken = 'test-access-token';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  region: 'us',
};

const user = {
  id: 0,
  name: `name-0`,
  email: `user-0@foo.bar`,
  role: { id: 'User' },
};

const users: usersConnector.SalesloftUser[] = Array.from({ length: 3 }, (_, i) => ({
  id: i,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
  role: { id: 'User' },
}));

const setup = createInngestFunctionMock(syncUsers, 'salesloft/users.sync.requested');

describe('sync-users', () => {
  beforeEach(() => {
    // Create a mock instance of NangoAPIClient
    const mockNangoAPIClient = {
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: accessToken,
        },
      }),
    };
    /* eslint-disable @typescript-eslint/no-unsafe-argument -- copy paste from inngest */
    /* eslint-disable @typescript-eslint/no-explicit-any -- needed for efficient type extraction */
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue(mockNangoAPIClient as any);
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
      page: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getUsers).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    const elba = spyOnElba();
    vi.spyOn(authConnector, 'getAuthUser').mockResolvedValue(user);

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
      name: 'salesloft/users.sync.requested',
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
          id: '0',
          isSuspendable: false,
          url: 'https://app.salesloft.com/app/settings/users/active',
          role: 'User',
        },
        {
          additionalEmails: [],
          displayName: 'name-1',
          email: 'user-1@foo.bar',
          id: '1',
          isSuspendable: true,
          url: 'https://app.salesloft.com/app/settings/users/active',
          role: 'User',
        },
        {
          additionalEmails: [],
          displayName: 'name-2',
          email: 'user-2@foo.bar',
          id: '2',
          isSuspendable: true,
          url: 'https://app.salesloft.com/app/settings/users/active',
          role: 'User',
        },
      ],
    });
    expect(elbaInstance?.users.delete).not.toBeCalled();
  });

  test('should finalize the sync when there is a no next page', async () => {
    const elba = spyOnElba();
    vi.spyOn(authConnector, 'getAuthUser').mockResolvedValue(user);

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
          displayName: 'name-0',
          email: 'user-0@foo.bar',
          id: '0',
          isSuspendable: false,
          url: 'https://app.salesloft.com/app/settings/users/active',
          role: 'User',
        },
        {
          additionalEmails: [],
          displayName: 'name-1',
          email: 'user-1@foo.bar',
          id: '1',
          isSuspendable: true,
          url: 'https://app.salesloft.com/app/settings/users/active',
          role: 'User',
        },
        {
          additionalEmails: [],
          displayName: 'name-2',
          email: 'user-2@foo.bar',
          id: '2',
          isSuspendable: true,
          url: 'https://app.salesloft.com/app/settings/users/active',
          role: 'User',
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncedBefore).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ syncedBefore: syncBeforeAtISO });
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
