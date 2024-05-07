import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/users';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import * as crypto from '@/common/crypto';
import { deleteSourceUser } from './delete-users';

const organisationId = '00000000-0000-0000-0000-000000000001';
const userId = 'user-id-1';
const token = 'test-api-key';

const organisation = {
  id: organisationId,
  token,
  region: 'us',
};

const setup = createInngestFunctionMock(deleteSourceUser, 'segment/users.delete.requested');

describe('deleteSourceUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete user', async () => {
    vi.spyOn(crypto, 'decrypt')
      .mockResolvedValueOnce('test-api-key')
      .mockResolvedValueOnce('test-api-secret');
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
