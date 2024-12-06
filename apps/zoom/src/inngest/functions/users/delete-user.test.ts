import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/zoom/users';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import * as nangoAPI from '@/common/nango/api';
import { deleteUser } from './delete-user';

const userId = 'user-id';
const accessToken = 'test-access-token';

// Mock data for organisation and user
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  region: 'us',
};

// Setup function mock for Inngest
const setup = createInngestFunctionMock(deleteUser, 'zoom/users.delete.requested');

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

  test('should deactivate user', async () => {
    vi.spyOn(usersConnector, 'deactivateUser').mockResolvedValueOnce();
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ userId, organisationId: organisation.id });

    await expect(result).resolves.toStrictEqual(undefined);

    expect(usersConnector.deactivateUser).toBeCalledTimes(1);
    expect(usersConnector.deactivateUser).toBeCalledWith({
      userId,
      accessToken,
    });
  });
});
