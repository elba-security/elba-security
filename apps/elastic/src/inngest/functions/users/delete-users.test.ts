import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/users';
import { Organisation } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { deleteSourceUsers } from './delete-users';

const userId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';
const userIds = 'test-id-1,test-id-2';
const apiKey = 'test-access-token';
const accountId = 'test-account-id';

// Mock data for organisation and user
const organisation = {
  id: userId,
  apiKey: await encrypt(apiKey),
  accountId,
  region: 'us',
};

// Setup function mock for Inngest
const setup = createInngestFunctionMock(deleteSourceUsers, 'elastic/users.delete.requested');

describe('deleteSourceUsers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test.only('should delete user', async () => {
    // Mock database response to return organisation details
    vi.spyOn(usersConnector, 'deleteUsers').mockResolvedValueOnce();
    await db.insert(Organisation).values(organisation);

    const [result] = setup({ userIds, organisationId: organisation.id });

    // Assert the function resolves successfully
    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUsers).toBeCalledTimes(1);
    expect(usersConnector.deleteUsers).toBeCalledWith({
      userIds,
      apiKey,
      accountId,
    });
  });
});
