import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/box/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as nangoAPI from '@/common/nango/api';
import { synchronizeUsers } from './sync-users';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  region: 'us',
};
const syncStartedAt = Date.now();
const syncedBefore = Date.now();
const nextPage = '1';
const accessToken = 'test-access-token';
const users: usersConnector.BoxUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `id-${i}`,
  name: `name-${i}`,
  status: 'active',
  login: `user-${i}@foo.bar`,
}));

const user = {
  authUserId: 'test-auth-user-id',
};
const setup = createInngestFunctionMock(synchronizeUsers, 'box/users.sync.requested');

describe('synchronize-users', () => {
  beforeEach(() => {
    const mockNangoAPIClient = {
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: accessToken,
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
      page: null,
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
      nextPage: parseInt(nextPage) + 1,
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
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'box/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        page: (parseInt(nextPage) + 1).toString(),
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
          isSuspendable: true,
          url: 'https://app.box.com/master/users/id-0',
        },
        {
          additionalEmails: [],
          displayName: 'name-1',
          email: 'user-1@foo.bar',
          id: 'id-1',
          isSuspendable: true,
          url: 'https://app.box.com/master/users/id-1',
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
          id: 'id-0',
          isSuspendable: true,
          url: 'https://app.box.com/master/users/id-0',
        },
        {
          additionalEmails: [],
          displayName: 'name-1',
          email: 'user-1@foo.bar',
          id: 'id-1',
          isSuspendable: true,
          url: 'https://app.box.com/master/users/id-1',
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncedBefore).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ syncedBefore: syncBeforeAtISO });
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
