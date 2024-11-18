import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import * as usersConnector from '@/connectors/docusign/users';
import { deleteUsers } from './delete-users';

const userIds = ['user-id-1', 'user-id-2'];

const newTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accountId: '00000000-0000-0000-0000-000000000005',
  authUserId: '00000000-0000-0000-0000-000000000006',
  apiBaseUri: 'some url',
  accessToken: await encrypt(newTokens.accessToken),
  refreshToken: await encrypt(newTokens.refreshToken),
  region: 'us',
};

const setup = createInngestFunctionMock(deleteUsers, 'docusign/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete user', async () => {
    vi.spyOn(usersConnector, 'deleteUsers').mockResolvedValueOnce();
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ organisationId: organisation.id, userIds });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUsers).toBeCalledTimes(1);
    expect(usersConnector.deleteUsers).toBeCalledWith({
      users: userIds.map((userId) => ({ userId })),
      accountId: organisation.accountId,
      accessToken: newTokens.accessToken,
      apiBaseUri: organisation.apiBaseUri,
    });
  });
});
