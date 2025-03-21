import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/okta/users';
import * as nangoAPIClient from '@/common/nango';
import { syncUsers } from './sync-users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

const validUsers: usersConnector.OktaUser[] = [
  {
    id: 'user-id',
    profile: {
      firstName: 'first-name',
      lastName: 'last-name',
      email: 'test-user-@foo.bar',
    },
  },
];

const invalidUsers = [];

const setup = createInngestFunctionMock(syncUsers, 'okta/users.sync.requested');

describe('sync-users', () => {
  test('should sync when organisation is registered', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
        connection_config: {
          subdomain: 'test-sub-domain',
        },
      }),
    }));

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers,
      invalidUsers,
      nextPage: null,
    });
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue('auth-user-id');

    const [result] = setup({
      region,
      organisationId,
      nangoConnectionId,
      syncStartedAt: new Date().getTime(),
      isFirstSync: false,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
  });
});
