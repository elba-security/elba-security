import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '../env';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers, deleteUser } from './users';
import type { HerokuError } from './commons/error';
import { users } from './__mocks__/fetch-users';

const validToken: string = env.HEROKU_TOKEN;
const teamId = 'test-team-id';
const userId = 'test-user-id';

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://api.heroku.com/enterprise-accounts/${teamId}/members`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const range = request.headers.get('Range');
        const lastRange = 'last-range';
        if (range !== lastRange) {
          return new Response(
            JSON.stringify({
              users,
            }),
            { headers: { 'Next-Range': 'next-range' }, status: 206 }
          );
        }

        return new Response(
          JSON.stringify({
            users,
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, teamId, null);
    expect(result.users).toEqual({ users });
  });

  test('should throw HerokuError when token is invalid', async () => {
    try {
      await getUsers('invalidToken', teamId, null);
    } catch (error) {
      expect((error as HerokuError).message).toEqual('Could not retrieve heroku users');
    }
  });

  test('should return next range as null when end of list is reached', async () => {
    const result = await getUsers(validToken, teamId, 'last-range');
    expect(result.pagination.nextRange).toBeNull();
  });

  test('should return next range when there is next range', async () => {
    const result = await getUsers(validToken, teamId, 'first-range');
    expect(result.pagination.nextRange).toEqual('next-range');
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(
        `https://api.heroku.com/enterprise-accounts/${teamId}/members/${userId}`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 200 });
        }
      )
    );
  });

  test('should delete user successfully when token are valid', async () => {
    await expect(deleteUser(validToken, teamId, userId)).resolves.not.toThrow();
  });

  test('should throw HerokuError when token is invalid', async () => {
    try {
      await deleteUser('invalidToken', teamId, userId);
    } catch (error) {
      expect((error as HerokuError).message).toEqual(`Could not delete user with Id: ${userId}`);
    }
  });
});
