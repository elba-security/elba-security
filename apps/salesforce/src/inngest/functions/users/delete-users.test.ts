import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/salesforce/users';
import * as nangoAPI from '@/common/nango';
import { deleteUser } from './delete-users';

const userId = '00000000-0000-0000-0000-000000000001';
const accessToken = 'test-access-token';
const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';
const instanceUrl = 'https://test-some-url.com';

const setup = createInngestFunctionMock(deleteUser, 'salesforce/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete user', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: 'test-access-token',
          raw: { instance_url: 'https://test-some-url.com' },
        },
      }),
    });

    const [result] = setup({ organisationId, region, nangoConnectionId, userId });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      accessToken,
      instanceUrl,
    });
  });
});
