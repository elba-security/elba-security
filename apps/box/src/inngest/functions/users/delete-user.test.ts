import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/box/users';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import * as nangoAPI from '@/common/nango/api';
import { deleteUser } from './delete-user';

const userId = 'user-id-1';
const accessToken = 'test-access-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  region: 'us',
};

const setup = createInngestFunctionMock(deleteUser, 'box/users.delete.requested');

describe('deleteUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Create a mock instance of NangoAPIClient
    const mockNangoAPIClient = {
      getConnection: vi.fn().mockResolvedValue({
        credentials: {
          access_token: accessToken,
        },
      }),
    };

    /* eslint-disable @typescript-eslint/no-unsafe-argument -- copy paste from inngest */
    /* eslint-disable @typescript-eslint/no-explicit-any -- needed for efficient type extraction */
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue(mockNangoAPIClient as any);
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
    });
  });
});
