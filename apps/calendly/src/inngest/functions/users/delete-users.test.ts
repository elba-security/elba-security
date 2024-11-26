import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/calendly/users';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import * as nangoAPI from '@/common/nango/api';
import { deleteUser } from './delete-users';

const userId = 'user-id';
const accessToken = 'test-access-token';
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  organizationUri: 'some organization_uri',
  region: 'us',
};

const setup = createInngestFunctionMock(deleteUser, 'calendly/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    const mockNangoAPIClient = {
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: accessToken,
        },
      }),
    };

    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue(
      mockNangoAPIClient as unknown as typeof nangoAPI.nangoAPIClient
    );
  });

  test('should delete users', async () => {
    vi.spyOn(usersConnector, 'deleteUser').mockResolvedValueOnce();
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ userId, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deleteUser).toBeCalledTimes(1);
    expect(usersConnector.deleteUser).toBeCalledWith({
      userId,
      accessToken,
    });
  });
});
