import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import * as usersConnector from '@/connectors/docusign/users';
import * as nangoAPI from '@/common/nango/api';
import * as authConnector from '@/connectors/docusign/auth';
import { deleteUsers } from './delete-users';

const userIds = ['user-id-1', 'user-id-2'];

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  connectionId: '00000000-0000-0000-0000-000000000006',
  region: 'us',
};

const setup = createInngestFunctionMock(deleteUsers, 'docusign/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete user', async () => {
    vi.spyOn(usersConnector, 'deleteUsers').mockResolvedValueOnce();
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(authConnector, 'getAuthUser').mockResolvedValue({
      accountId: 'account-id',
      apiBaseUri: 'some url',
      authUserId: 'auth-user',
    });

    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ organisationId: organisation.id, userIds });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUsers).toBeCalledTimes(1);
    expect(usersConnector.deleteUsers).toBeCalledWith({
      users: userIds.map((userId) => ({ userId })),
      accountId: 'account-id',
      accessToken: 'access-token',
      apiBaseUri: 'some url',
    });
  });
});
