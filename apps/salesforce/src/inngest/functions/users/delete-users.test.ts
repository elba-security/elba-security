import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/salesforce/users';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { deleteUser } from './delete-users';

const userId = '00000000-0000-0000-0000-000000000001';
const accessToken = 'test-access-token';
const refreshToken = 'test-refresh-token';
const instanceUrl = 'test-some url';

const organisation = {
  id: userId,
  accessToken: await encrypt(accessToken),
  refreshToken: await encrypt(refreshToken),
  instanceUrl,
  region: 'us',
};

const setup = createInngestFunctionMock(deleteUser, 'salesforce/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete user', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ userId, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      accessToken,
      instanceUrl,
    });
  });
});
