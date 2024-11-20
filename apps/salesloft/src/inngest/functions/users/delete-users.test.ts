import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as usersConnector from '@/connectors/salesloft/users';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';
import * as nangoAPI from '@/common/nango/api';
import { deleteUser } from './delete-users';

const userId = 'user-id';
const accessToken = 'test-access-token';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  region: 'us',
};

const setup = createInngestFunctionMock(deleteUser, 'salesloft/users.delete.requested');

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
