import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/gusto/users';
import { syncUsers } from './sync-users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const syncStartedAt = Date.now();
const nextPage = 2;

const users: usersConnector.GustoUser[] = Array.from({ length: 3 }, (_, i) => ({
  uuid: `00000000-0000-0000-0000-00000000009${i}`,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  terminated: false,
  email: `user-${i}@foo.bar`,
}));

const setup = createInngestFunctionMock(syncUsers, 'gusto/users.sync.requested');

describe('sync-users', () => {
  test('should continue the sync when there is a next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    }));
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue({
      authUserEmail: 'auth-user@email',
    });
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: 1,
    });

    const [result, { step }] = setup({
      organisationId,
      region,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: nextPage,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users', {
      name: 'gusto/users.sync.requested',
      data: {
        organisationId,
        region,
        nangoConnectionId,
        isFirstSync: false,
        syncStartedAt,
        page: nextPage,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    }));
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue({
      authUserEmail: 'auth-user@email',
    });
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: 1,
    });

    const [result, { step }] = setup({
      region,
      organisationId,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: 1,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
