import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/asana/users';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { deleteUser } from './delete-users';

const userId = 'user-id';
const accessToken = 'test-access-token';
const refreshToken = 'test-refresh-token';
const workspaceId = '000000';
// Mock data for organisation and user
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt(accessToken),
  refreshToken: await encrypt(refreshToken),
  authUserId: 'test-auth-user-id',
  region: 'us',
};

// Setup function mock for Inngest
const setup = createInngestFunctionMock(deleteUser, 'asana/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete users', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();
    vi.spyOn(usersConnector, 'getUser').mockResolvedValueOnce([workspaceId]);
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ userId, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);
    expect(usersConnector.getUser).toHaveBeenCalledTimes(1);
    expect(usersConnector.getUser).toHaveBeenCalledWith({ accessToken, userId });

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      workspaceId,
      accessToken,
    });
  });
});
