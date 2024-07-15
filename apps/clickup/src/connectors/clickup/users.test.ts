import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { ClickUpError } from '../commons/error';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const teamId = 'test-team-id';
const userId = 'test-user-id';

const usersApiResponse = [
  {
    user: {
      id: 'test-id',
      username: 'test-username',
      email: 'test-user-@foo.bar',
      role: 1,
    },
  },
];

const validUsers = [
  {
    id: 'test-id',
    username: 'test-username',
    email: 'test-user-@foo.bar',
    role: 'owner',
  },
]

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
      http.get(`${env.CLICKUP_API_BASE_URL}/team/${teamId}`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(
          JSON.stringify({
            team: {
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
    const result = await getUsers(validToken, teamId);
    expect(result).toEqual({ validUsers, invalidUsers });
  });

  test('should throw ClickUpError when token is invalid', async () => {
    await expect(getUsers('invalidToken', teamId)).rejects.toThrowError(ClickUpError);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(`${env.CLICKUP_API_BASE_URL}/team/${teamId}/user/${userId}`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(undefined, { status: 200 });
      })
    );
  });

  test('should delete user successfully when token are valid', async () => {
    await expect(deleteUser(validToken, teamId, userId)).resolves.not.toThrow();
  });

  test('should throw ClickUpError when token is invalid', async () => {
    await expect(deleteUser('invalidToken', teamId, userId)).rejects.toThrowError(ClickUpError);
  });
});
