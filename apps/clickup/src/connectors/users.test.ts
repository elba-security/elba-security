import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers, deleteUser } from './users';
import type { ClickUpError } from './commons/error';
// import type { ClickUpUser } from './types';

const validToken = 'token-1234';
const teamId = 'test-team-id';
const userId = 'test-user-id';

const users = [
  {
    user: {
      id: 'test-id',
      username: 'test-username',
      email: 'test-user-@foo.bar',
      role: 1,
    },
  },
];
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
      http.get(`https://api.clickup.com/api/v2/team/${teamId}`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(
          JSON.stringify({
            team: {
              members: users,
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
    expect(result.users).toEqual([
      {
        id: 'test-id',
        username: 'test-username',
        email: 'test-user-@foo.bar',
        role: 'owner',
      },
    ]);
  });

  test('should throw ClickUpError when token is invalid', async () => {
    try {
      await getUsers('invalidToken', teamId);
    } catch (error) {
      expect((error as ClickUpError).message).toEqual('Could not retrieve users');
    }
  });
});
describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(`https://api.clickup.com/api/v2/team/${teamId}/user/${userId}`, ({ request }) => {
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
    try {
      await deleteUser('invalidToken', teamId, userId);
    } catch (error) {
      expect((error as ClickUpError).message).toEqual(`Could not delete user with Id: ${userId}`);
    }
  });
});
