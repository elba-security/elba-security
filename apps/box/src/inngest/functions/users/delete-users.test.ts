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

const organisation = {
  id: userId,
  accessToken: await encrypt(accessToken),
  refreshToken: await encrypt(refreshToken),
  region: 'us',
};

const setup = createInngestFunctionMock(deleteSourceUsers, 'box/users.delete.requested');

describe('deleteSourceUsers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete user', async () => {
    vi.spyOn(usersConnector, 'deleteUsers').mockResolvedValueOnce();
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ userId, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUsers).toBeCalledTimes(1);
    expect(usersConnector.deleteUsers).toBeCalledWith({
      userId,
      token: accessToken,
    });
  });
});
