import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/users';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { deleteSourceUsers } from './delete-users';

const userId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';
const accessToken = 'test-access-token';
const refreshToken = 'test-refresh-token';

// Mock data for organisation and user
const organisation = {
  id: userId,
  accessToken: await encrypt(accessToken),
  refreshToken: await encrypt(refreshToken),
  region: 'us',
};

// Setup function mock for Inngest
const setup = createInngestFunctionMock(deleteSourceUsers, 'gitlab/users.delete.requested');

describe('deleteSourceUsers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test.only('should delete user', async () => {
    // Mock database response to return organisation details
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ userId, organisationId: organisation.id });

    // Assert the function resolves successfully
    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      accessToken,
    });
  });
});
