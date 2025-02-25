import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/clickup/users';
import * as nangoAPIClient from '@/common/nango';
import { syncUsers } from './sync-users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

const validUsers: usersConnector.ClickUpUser[] = [
  {
    id: 10,
    username: 'test-username',
    email: 'test-user-@foo.bar',
    role: 'test-role',
  },
];

const invalidUsers = [];

const setup = createInngestFunctionMock(syncUsers, 'clickup/users.sync.requested');

describe('sync-users', () => {
  test('should sync when organisation is registered', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    }));

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers,
      invalidUsers,
    });

    const [result] = setup({
      region,
      organisationId,
      nangoConnectionId,
      syncStartedAt: new Date().getTime(),
      isFirstSync: false,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
  });
});
