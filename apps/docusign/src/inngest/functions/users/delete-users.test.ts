import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import * as usersConnector from '@/connectors/docusign/users';
import * as nangoAPI from '@/common/nango/api';
import { deleteUsers } from './delete-users';

const userIds = ['user-id-1', 'user-id-2'];

const newTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

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
    vi.spyOn(nangoAPI, 'nangoAPIClient').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: 'access-token',
        },
      }),
    });

    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ organisationId: organisation.id, userIds });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUsers).toBeCalledTimes(1);
    expect(usersConnector.deleteUsers).toBeCalledWith({
      users: userIds.map((userId) => ({ userId })),
      accountId: '00000000-0000-0000-0000-000000000005',
      accessToken: newTokens.accessToken,
      apiBaseUri: 'some url',
    });
  });
});
