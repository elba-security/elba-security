import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/asana/users';
import * as nangoAPI from '@/common/nango';
import { deleteUser } from './delete-users';

const userIds = ['user-id'];
const accessToken = 'test-access-token';
const workspaceId = '000000';
// Mock data for organisation and user
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  region: 'us',
};

// Setup function mock for Inngest
const setup = createInngestFunctionMock(deleteUser, 'asana/users.delete.requested');

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

  test('should delete users', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();
    vi.spyOn(usersConnector, 'getWorkspaceIds').mockResolvedValueOnce([workspaceId]);

    const [result] = setup({ userIds, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);
    expect(usersConnector.getWorkspaceIds).toHaveBeenCalledTimes(1);
    expect(usersConnector.getWorkspaceIds).toHaveBeenCalledWith(accessToken);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userIds,
      workspaceId,
      accessToken,
    });
  });
});
