import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as nangoAPI from '@/common/nango';
import * as usersConnector from '@/connectors/pipedrive/users';
import { deleteUser } from './delete-users';

const userId = 'user-id';
const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';
const apiDomain = 'https://test-domain.com';

// Setup function mock for Inngest
const setup = createInngestFunctionMock(deleteUser, 'pipedrive/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete users', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: 'access-token',
          raw: {
            api_domain: 'https://test-domain.com',
          },
        },
      }),
    });
    const [result] = setup({ organisationId, region, nangoConnectionId, userId });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      accessToken: 'access-token',
      apiDomain,
    });
  });
});
