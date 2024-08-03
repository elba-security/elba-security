import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/jira/users';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { deleteUser } from './delete-user';

const userId = 'user-id';
const apiToken = 'test-access-token';
const domain = 'test-domain';
const email = 'test@email';
const ownerId = 'test-owner-id';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiToken: await encrypt(apiToken),
  region: 'us',
  domain,
  email,
  ownerId,
};

const setup = createInngestFunctionMock(deleteUser, 'jira/users.delete.requested');

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
      apiToken,
      domain,
      email,
    });
  });
});
