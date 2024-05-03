/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenient */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenient */

import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MondayError } from '../common/error';
import { getUsers } from './users';
import type { MondayUsersResponse, MondayUser } from './users';

const baseApiUrl = env.MONDAY_API_BASE_URL;
const mockToken = 'valid-token';

const validUsers: MondayUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `user-name-${i}`,
  email: `user${i}@foo.bar`,
}));

const usersData: MondayUsersResponse = {
  data: {
    users: validUsers,
  },
  account_id: 123,
};

const setupServer = ({
  hasError = false,
  hasIncorrectField = false,
  responseData = usersData,
}: {
  hasError?: boolean;
  hasIncorrectField?: boolean;
  responseData?: MondayUsersResponse;
}) => {
  server.use(
    http.post(baseApiUrl, ({ request }) => {
      if (request.headers.get('Authorization') !== `Bearer ${mockToken}`) {
        return new Response(undefined, { status: 401 });
      }

      if (hasError) {
        return new Response(undefined, { status: 500 });
      }

      if (hasIncorrectField) {
        return Response.json({ incorrect_field: 'unexpected' });
      }

      return Response.json(responseData);
    })
  );
};

describe('getUsers', () => {
  test('should successfully retrieve valid users & next page when the toke is valid', async () => {
    setupServer({});
    await expect(getUsers({ token: mockToken, page: null })).resolves.toStrictEqual({
      validUsers,
      invalidUsers: [],
      nextPage: 1,
    });
  });

  test('should handle pagination correctly when more users are available', async () => {
    setupServer({});
    await expect(getUsers({ token: mockToken, page: 1 })).resolves.toStrictEqual({
      validUsers,
      invalidUsers: [],
      nextPage: 2,
    });
  });

  test('should throw an error when the response is not ok', async () => {
    setupServer({
      hasError: true,
    });

    await expect(
      getUsers({
        token: mockToken,
        page: null,
      })
    ).rejects.toThrow(MondayError);
  });

  test('should throw an error if the response does not conform to the schema', async () => {
    setupServer({
      hasIncorrectField: true,
    });

    await expect(
      getUsers({
        token: mockToken,
        page: null,
      })
    ).rejects.toThrow(Error);
  });

  test('should distinguish between valid and invalid user data', async () => {
    const mixedUsersData = {
      data: {
        users: [
          { id: '1', email: 'user1@example.com', name: 'User One' }, // valid
          { id: '2', email: 'not-an-email', name: 'User Two' }, // invalid email
        ],
      },
      account_id: 123,
    };

    setupServer({
      responseData: mixedUsersData,
    });

    const result = await getUsers({
      token: mockToken,
      page: null,
    });

    expect(result.validUsers.length).toBe(1);
    expect(result.invalidUsers.length).toBe(1);
  });
});
