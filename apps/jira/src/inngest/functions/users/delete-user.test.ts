import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as nangoAPI from '@/common/nango';
import * as usersConnector from '@/connectors/jira/users';
import { deleteUser } from './delete-user';

const userId = 'user-id';
const apiToken = 'test-access-token';
const domain = 'test-domain';
const email = 'test@email';

const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const setup = createInngestFunctionMock(deleteUser, 'jira/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete user', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { username: email, password: apiToken },
        connection_config: {
          subdomain: domain,
        },
      }),
    });
    const [result] = setup({ organisationId, region, nangoConnectionId, userId });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      apiToken,
      domain,
      email,
    });
  });
});
