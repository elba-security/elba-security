import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/gusto/users';
import * as nangoAPI from '@/common/nango';
import { deleteUser } from './delete-users';

const userId = 'user-id';
const accessToken = 'test-access-token';
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  region: 'us',
};

const setup = createInngestFunctionMock(deleteUser, 'gusto/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    const mockNangoAPIClient = {
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: accessToken,
        },
      }),
    };

    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue(
      mockNangoAPIClient as unknown as typeof nangoAPI.nangoAPIClient
    );
  });

  test('should delete user', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();

    const [result] = setup({ userId, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      accessToken,
    });
  });
});
