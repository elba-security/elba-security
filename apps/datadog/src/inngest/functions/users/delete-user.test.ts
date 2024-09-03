import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/datadog/users';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { deleteUser } from './delete-user';

const userId = 'user-id';
const apiKey = 'test-access-token';
const appKey = 'test-appKey';
const authUserId = 'test-authUserId';
const sourceRegion = 'EU';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiKey: await encrypt(apiKey),
  region: 'us',
  appKey,
  authUserId,
  sourceRegion,
};

const setup = createInngestFunctionMock(deleteUser, 'datadog/users.delete.requested');

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
      apiKey,
      appKey,
      sourceRegion,
    });
  });
});
