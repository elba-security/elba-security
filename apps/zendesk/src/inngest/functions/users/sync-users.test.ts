import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/zendesk/users';
import * as nangoAPIClient from '@/common/nango';
import { syncUsers } from './sync-users';

const subDomain = 'https://some-subdomain';
const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

const syncStartedAt = Date.now();
const nextPageLink = `https://${subDomain}.zendesk.com/api/v2/users?page=2&per_page=1&role%5B%5D=admin&role%5B%5D=agent`;
const users: usersConnector.ZendeskUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: i,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
  active: true,
  role: 'admin',
}));

const setup = createInngestFunctionMock(syncUsers, 'zendesk/users.sync.requested');

describe('synchronize-users', () => {
  test('should continue the sync when there is a next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    }));

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: nextPageLink,
    });
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue({
      authUserId: 'auth-user',
    });
    vi.spyOn(usersConnector, 'getOwnerId').mockResolvedValue({
      ownerId: 'owner-id',
    });
    const [result, { step }] = setup({
      organisationId,
      region,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: nextPageLink,
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'zendesk/users.sync.requested',
      data: {
        organisationId,
        region,
        nangoConnectionId,
        isFirstSync: false,
        syncStartedAt,
        page: nextPageLink,
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

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: nextPageLink,
    });
    vi.spyOn(usersConnector, 'getAuthUser').mockResolvedValue({
      authUserId: 'auth-user',
    });
    vi.spyOn(usersConnector, 'getOwnerId').mockResolvedValue({
      ownerId: 'owner-id',
    });

    const [result, { step }] = setup({
      organisationId,
      region,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
