import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import * as crypto from '@/app/common/crypto';
import { Organisation } from '@/database/schema';
import { db } from '@/database/client';
import { encrypt } from '@/app/common/crypto';
import { deleteSourceUsers } from './delete-users';

const accessToken = 'test-access-token';
const region = 'us';
const userId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c91';
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessToken: await encrypt(accessToken),
  region,
};

// Setup function mock for Inngest
const setup = createInngestFunctionMock(deleteSourceUsers, 'aircall/users.delete.requested');

describe('deleteSourceUsers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should throw NonRetriableError when userid is not found', async () => {
    vi.spyOn(crypto, 'encrypt').mockResolvedValue(accessToken);

    // Mock database response to simulate no organisation found
    vi.spyOn(usersConnector, 'deleteUsers').mockResolvedValueOnce({
      success: true,
    });

    const [result] = setup({ userId });

    // Assert that the function throws a NonRetriableError
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    await expect(result).rejects.toHaveProperty('message', `Could not retrieve ${userId}`);
  });

  test('should call deleteUsers with correct parameters', async () => {
    vi.spyOn(crypto, 'encrypt').mockResolvedValue(accessToken);

    // Mock database response to return organisation details
    vi.spyOn(usersConnector, 'deleteUsers').mockResolvedValueOnce({ success: true });
    await db.insert(Organisation).values(organisation);

    const [result] = setup({ userId });

    // Assert the function resolves successfully
    await expect(result).resolves.toStrictEqual({ success: true });

    expect(usersConnector.deleteUsers).toBeCalledTimes(1);
    expect(usersConnector.deleteUsers).toBeCalledWith({
      userId,
      token: accessToken,
    });
  });
});
