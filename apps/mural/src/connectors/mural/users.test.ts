import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MuralError } from '../common/error';
import { getUsers } from './users';

const validToken = 'token-1234';
const muralId = 'test-mural-id';

const usersApiResponse = [
  {
    user: {
      id: 10,
      username: 'test-username',
      email: 'test-user-@foo.bar',
      role: 1,
      date_joined: '1721810909456',
    },
  },
];

const validUsers = [
  {
    id: 10,
    username: 'test-username',
    email: 'test-user-@foo.bar',
    role: 'owner',
  },
];

const invalidUsers = [];

const roles = [
  {
    id: 1,
    name: 'owner',
  },
  {
    id: 2,
    name: 'admin',
  },
  {
    id: 3,
    name: 'member',
  },
  {
    id: 4,
    name: 'guest',
  },
];

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.MURAL_API_BASE_URL}/murals/${muralId}`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(
          JSON.stringify({
            workspace: {
              members: usersApiResponse,
              roles,
            },
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should fetch users when token is valid', async () => {
    const result = await getUsers({
      token: validToken,
      muralId,
    });
    expect(result).toEqual({ validUsers, invalidUsers });
  });

  test('should throw MuralError when token is invalid', async () => {
    await expect(
      getUsers({
        token: 'invalidToken',
        muralId,
      })
    ).rejects.toThrowError(MuralError);
  });
});
