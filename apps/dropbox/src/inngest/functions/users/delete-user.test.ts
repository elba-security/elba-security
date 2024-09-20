import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/dropbox/users';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { deleteUser } from './delete-user';

const userId = 'user-id';
const accessToken = 'test-access-token';
const refreshToken = 'test-refresh-token';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt(accessToken),
  refreshToken: await encrypt(refreshToken),
  adminTeamMemberId: 'admin-team-member-id',
  rootNamespaceId: 'root-namespace-id',
  region: 'us',
};

const setup = createInngestFunctionMock(deleteUser, 'dropbox/users.delete.requested');

describe('deleteUser', () => {
  test('should deactivate user', async () => {
    vi.spyOn(usersConnector, 'suspendUser').mockResolvedValueOnce();
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ userId, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.suspendUser).toBeCalledTimes(1);
    expect(usersConnector.suspendUser).toBeCalledWith({
      teamMemberId: userId,
      accessToken,
    });
  });
});
