import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/bamboohr/users';
import * as nangoAPI from '@/common/nango';
import { syncUsers } from './sync-users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const userName = 'user-name';
const password = 'password';
const subDomain = 'test-domain';

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsers, 'bamboohr/users.sync.requested');

describe('sync-users', () => {
  test('should finalize the sync when there is a no next page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { username: userName, password },
        connection_config: { subdomain: subDomain },
      }),
    });

    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      validUsers: [
        {
          employeeId: 1,
          firstName: 'firstName-1',
          lastName: 'lastName-1',
          email: 'user-1@foo.bar',
          status: 'enabled',
        },
        {
          employeeId: 2,
          firstName: 'firstName-2',
          lastName: 'lastName-2',
          email: 'user-2@foo.bar',
          status: 'enabled',
        },
      ],
      invalidUsers: [],
    });

    const [result, { step }] = setup({
      region,
      organisationId,
      nangoConnectionId,
      isFirstSync: false,
      syncStartedAt,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
