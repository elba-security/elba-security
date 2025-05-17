import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/freshdesk/users';
import * as nangoAPI from '@/common/nango';
import { syncUsers } from './sync-users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

const syncStartedAt = Date.now();

const userName = 'user-name';
const password = 'password';
const subDomain = 'test-domain';

const users: usersConnector.FreshdeskUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: i,
  contact: {
    name: `name-${i}`,
    email: `user-${i}@foo.bar`,
    active: true,
  },
}));

const setup = createInngestFunctionMock(syncUsers, 'freshdesk/users.sync.requested');

describe('sync-users', () => {
  test('should continue the sync when there is a next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { username: userName, password },
        connection_config: { subdomain: subDomain },
      }),
    });
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue({
      authUserEmail: 'test@email.com',
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
      page: 1,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-users', {
      name: 'freshdesk/users.sync.requested',
      data: {
        organisationId,
        region,
        nangoConnectionId,
        isFirstSync: false,
        syncStartedAt,
        page: 1,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { username: userName, password },
        connection_config: { subdomain: subDomain },
      }),
    });
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue({
      authUserEmail: 'https://test-domain.freshdesk.com',
    });
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
    });

    const [result, { step }] = setup({
      region,
      organisationId,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
