import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as nangoAPI from '@/common/nango';
import * as usersConnector from '@/connectors/clickup/users';
import * as teamIdsConnector from '@/connectors/clickup/teams';
import { deleteUser } from './delete-user';

const organisationId = '00000000-0000-0000-0000-000000000001';
const nangoConnectionId = 'nango-connection-id';
const region = 'us';

const userId = 'user-id';

const setup = createInngestFunctionMock(deleteUser, 'clickup/users.delete.requested');

describe('delete-user-request', () => {
  test('should continue the request', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValue(undefined);
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });

    vi.spyOn(teamIdsConnector, 'getTeamIds').mockResolvedValue([
      {
        id: 'team-id',
      },
    ]);

    const [result] = setup({ organisationId, region, nangoConnectionId, userId });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith(
      expect.objectContaining({
        token: 'access-token',
        userId,
        teamId: 'team-id',
      })
    );
  });
});
