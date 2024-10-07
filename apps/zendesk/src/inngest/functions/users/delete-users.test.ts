import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/zendesk/users';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { deleteUser } from './delete-users';

const userId = 'user-id';
const accessToken = 'test-access-token';
const ownerId = 'test-owner-id';
const subDomain = 'some-subdomain';
const authUserId = 'test-auth-user-id';
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt(accessToken),
  organizationUri: 'some organization_uri',
  subDomain,
  region: 'us',
  ownerId,
  authUserId,
};

const setup = createInngestFunctionMock(deleteUser, 'zendesk/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete users', async () => {
    vi.spyOn(usersConnector, 'suspendUser').mockResolvedValueOnce();
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ userId, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.suspendUser).toBeCalledTimes(1);
    expect(usersConnector.suspendUser).toBeCalledWith({
      userId,
      accessToken,
      subDomain,
    });
  });
});
