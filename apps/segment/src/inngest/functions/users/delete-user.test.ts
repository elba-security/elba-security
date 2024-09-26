import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/segment/users';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import * as crypto from '@/common/crypto';
import { deleteUser } from './delete-user';

const organisationId = '00000000-0000-0000-0000-000000000001';
const userId = 'user-id-1';
const token = 'test-api-key';
const workspaceName = 'test-workspace-name';
const authUserEmail = 'auth-user@alpha.com';

const organisation = {
  id: organisationId,
  token,
  region: 'us',
  workspaceName,
  authUserEmail,
};

const setup = createInngestFunctionMock(deleteUser, 'segment/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete user', async () => {
    vi.spyOn(crypto, 'decrypt').mockResolvedValueOnce('test-api-key');
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ userId, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      token,
    });
  });
});
