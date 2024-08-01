import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/elastic/users';
import * as organizationConnector from '@/connectors/elastic/organization';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { deleteUser } from './delete-user';

const userId = 'user-id';
const apiKey = 'test-access-token';
const organizationId = 'test-organization-id';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiKey: await encrypt(apiKey),
  region: 'us',
};

const setup = createInngestFunctionMock(deleteUser, 'elastic/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete user', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();
    vi.spyOn(organizationConnector, 'getOrganizationId').mockResolvedValueOnce({ organizationId });
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ userId, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      apiKey,
      organizationId,
    });
  });
});
