import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/calendly/users';
import * as nangoAPIClient from '@/common/nango';
import { syncUsers } from './sync-users';

const syncStartedAt = Date.now();
const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

const roles = ['owner', 'admin', 'user'];

const users: usersConnector.CalendlyUser[] = Array.from({ length: 3 }, (_, i) => ({
  uri: `https://test-uri/organization_memberships/00000000-0000-0000-0000-00000000009${i}`,
  role: roles[i] ?? 'user',
  user: {
    name: `name-${i}`,
    email: `user-${i}@foo.bar`,
    uri: `https://test-uri/users/00000000-0000-0000-0000-00000000009${i}`,
  },
}));

const setup = createInngestFunctionMock(syncUsers, 'calendly/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: 'access-token',
        },
      }),
    }));
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: users,
      invalidUsers: [],
      nextPage: 'some page',
    });

    const [result, { step }] = setup({
      organisationId,
      region,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
      page: 'some after',
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(usersConnector.getUsers).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should finalize the sync when there is a no next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: 'access-token',
          raw: {
            owner: `https://api.calendly.com/users/${organisationId}`,
            organization: `${users.at(0)?.user.uri}`,
          },
        },
      }),
    }));

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
