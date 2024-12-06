import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/zoom/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as nangoAPI from '@/common/nango/api';
import { syncUsers } from './sync-users';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  region: 'us',
};

const roles: Record<number, string> = {
  0: '0',
  1: '1',
  2: '2',
  3: '1',
};

const syncStartedAt = Date.now();
const syncedBefore = Date.now();
const accessToken = 'test-access-token';
const nextPage = '1';
const users: usersConnector.ZoomUser[] = Array.from({ length: 4 }, (_, i) => ({
  id: `id-${i}`,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  display_name: `display_name-${i}`,
  email: `user-${i}@foo.bar`,
  role_id: !roles[i] ? '2' : roles[i],
  status: 'active',
}));

const user = {
  authUserId: 'test-auth-user-id',
};

const setup = createInngestFunctionMock(syncUsers, 'zoom/users.sync.requested');

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
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'zoom/users.sync.requested',
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
          displayName: 'display_name-0',
          email: 'user-0@foo.bar',
          id: 'id-0',
          isSuspendable: false,
          url: 'https://zoom.us/user/id-0/profile',
        },
        {
          additionalEmails: [],
          displayName: 'display_name-1',
          email: 'user-1@foo.bar',
          id: 'id-1',
          isSuspendable: false,
          url: 'https://zoom.us/user/id-1/profile',
        },
        {
          additionalEmails: [],
          displayName: 'display_name-2',
          email: 'user-2@foo.bar',
          id: 'id-2',
          isSuspendable: true,
          url: 'https://zoom.us/user/id-2/profile',
        },
        {
          additionalEmails: [],
          displayName: 'display_name-3',
          email: 'user-3@foo.bar',
          id: 'id-3',
          isSuspendable: false,
          url: 'https://zoom.us/user/id-3/profile',
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
          displayName: 'display_name-0',
          email: 'user-0@foo.bar',
          id: 'id-0',
          isSuspendable: false,
          url: 'https://zoom.us/user/id-0/profile',
        },
        {
          additionalEmails: [],
          displayName: 'display_name-1',
          email: 'user-1@foo.bar',
          id: 'id-1',
          isSuspendable: false,
          url: 'https://zoom.us/user/id-1/profile',
        },
        {
          additionalEmails: [],
          displayName: 'display_name-2',
          email: 'user-2@foo.bar',
          id: 'id-2',
          isSuspendable: true,
          url: 'https://zoom.us/user/id-2/profile',
        },
        {
          additionalEmails: [],
          displayName: 'display_name-3',
          email: 'user-3@foo.bar',
          id: 'id-3',
          isSuspendable: false,
          url: 'https://zoom.us/user/id-3/profile',
        },
      ],
    });
    const syncBeforeAtISO = new Date(syncedBefore).toISOString();
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ syncedBefore: syncBeforeAtISO });
    // the function should not send another event that continue the pagination
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
