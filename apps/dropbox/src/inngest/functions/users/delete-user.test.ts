import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as nangoAPI from '@/common/nango';
import * as usersConnector from '@/connectors/dropbox/users';
import { deleteUser } from './delete-user';

const userId = 'user-id';
const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const setup = createInngestFunctionMock(deleteUser, 'dropbox/users.delete.requested');

describe('deleteUser', () => {
  test('should deactivate user', async () => {
    vi.spyOn(usersConnector, 'suspendUser').mockResolvedValueOnce();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });

    const [result] = setup({ organisationId, region, nangoConnectionId, userId });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.suspendUser).toBeCalledTimes(1);
    expect(usersConnector.suspendUser).toBeCalledWith({
      teamMemberId: userId,
      accessToken: 'access-token',
    });
  });
});
