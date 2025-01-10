import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/sendgrid/users';
import * as nangoAPIClient from '@/common/nango';
import { syncUsers } from './sync-users';

const nextPage = 1;
const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

const users: usersConnector.SendgridUser[] = Array.from({ length: 2 }, (_, i) => ({
  username: `username-${i}`,
  email: `user-${i}@foo.bar`,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  user_type: 'teammate',
}));

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsers, 'sendgrid/users.sync.requested');

describe('sync-users', () => {
  test('should continue the sync when the organization is registered', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { apiKey: 'api-key' },
      }),
    }));

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: 2,
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
      name: 'sendgrid/users.sync.requested',
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

  test('should finalize the sync when there is a no next offset', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { apiKey: 'api-key' },
      }),
    }));

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: null,
    });

    const [result, { step }] = setup({
      organisationId,
      region,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: 0,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
