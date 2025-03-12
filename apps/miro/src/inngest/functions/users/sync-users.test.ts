import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/miro/users';
import * as nangoAPIClient from '@/common/nango';
import { syncUsers } from './sync-users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

const validUsers: usersConnector.MiroUser[] = [
  {
    id: 'user-id',
    email: 'test-user-@foo.bar',
  },
];

const invalidUsers = [];

const setup = createInngestFunctionMock(syncUsers, 'miro/users.sync.requested');

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
      nextPage: null,
    });
    vi.spyOn(usersConnector, 'getTokenInfo').mockResolvedValue('org-id');

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
