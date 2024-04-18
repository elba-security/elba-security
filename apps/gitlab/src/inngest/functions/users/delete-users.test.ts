import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/gitlab/users';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import { encrypt } from '@/common/crypto';
import { deleteSourceUsers } from './delete-users';

const accessToken = 'test-access-token';
const refreshToken = 'test-refresh-token';
const region = 'us';
const userId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c91';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessToken: await encrypt(accessToken),
  refreshToken: await encrypt(refreshToken),
  region,
};

// Setup function mock for Inngest
const setup = createInngestFunctionMock(deleteSourceUsers, 'gitlab/users.delete.requested');

describe('deleteSourceUsers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should throw NonRetriableError when userid is not found', async () => {
    // Mock database response to simulate no organisation found
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();

    const [result] = setup({ userId, organisationId: organisation.id });

    // Assert that the function throws a NonRetriableError
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    await expect(result).rejects.toHaveProperty('message', `Could not retrieve organisation`);
  });

  test('should call deleteUser with correct parameters', async () => {
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

  test('should not throw when user exists', async () => {
    // Mock deleteUser to simulate successful deletion
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();

    await expect(
      usersConnector.deleteUser({
        userId,
        accessToken,
      })
    ).resolves.not.toThrow();

    // Verify deleteUser was called correctly
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      accessToken,
    });
  });

  test('should not throw when user does not exist (in case of 404)', async () => {
    // Mock deleteUser to simulate a 404 response
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce(); // Assuming your implementation already handles 404 internally

    await expect(
      usersConnector.deleteUser({
        userId,
        accessToken,
      })
    ).resolves.not.toThrow();

    // Verify deleteUser was called correctly
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      accessToken,
    });
  });

  test('should throw when access token is invalid', async () => {
    // Mock deleteUser to simulate an error due to invalid token
    const errorMessage = 'Invalid access token';
    vi.spyOn(usersConnector, 'deleteUser').mockRejectedValueOnce(new Error(errorMessage));

    await expect(
      usersConnector.deleteUser({
        userId,
        accessToken: 'invalid-id',
      })
    ).rejects.toThrow(errorMessage);

    // Verify deleteUser was called with the invalid token
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      accessToken: 'invalid-id',
    });
  });
});
