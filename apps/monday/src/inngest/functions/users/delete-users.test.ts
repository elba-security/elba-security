import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/monday/users';
import * as authConnector from '@/connectors/monday/auth';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { deleteUsers } from './delete-users';

const userIds = ['user-id-1', 'user-id-2'];
const accessToken = 'test-access-token';
const workspaceId = '000000';
// Mock data for organisation and user
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt(accessToken),
  region: 'us',
};

// Setup function mock for Inngest
const setup = createInngestFunctionMock(deleteUsers, 'monday/users.delete.requested');

describe('deleteUsers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete users', async () => {
    vi.spyOn(usersConnector, 'deleteUsers').mockResolvedValueOnce();
    vi.spyOn(authConnector, 'getWorkspaceIds').mockResolvedValueOnce([workspaceId]);
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ userIds, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);
    expect(authConnector.getWorkspaceIds).toHaveBeenCalledTimes(1);
    expect(authConnector.getWorkspaceIds).toHaveBeenCalledWith(accessToken);

    expect(usersConnector.deleteUsers).toBeCalledTimes(1);
    expect(usersConnector.deleteUsers).toBeCalledWith({
      userIds,
      workspaceId,
      accessToken,
    });
  });
});
