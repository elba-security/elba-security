import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { deleteUser, getUsers } from './users';
import type { WebflowError } from './commons/error';
import { users } from './__mocks__/users';

const validToken = 'valid-token';
const siteId = 'test-site-id';
const userId = 'test-user-id';
const maxUsers = 20;

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.WEBFLOW_API_BASE_URL}/v2/sites/${siteId}/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const offset = parseInt(url.searchParams.get('offset') || '0');
        return new Response(
          JSON.stringify({
            users,
            count: users.length,
            limit: env.USERS_SYNC_BATCH_SIZE,
            offset,
            total: maxUsers,
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, siteId, 0);
    expect(result.users).toEqual(users);
  });

  test('should throw WebflowError when token is invalid', async () => {
    try {
      await getUsers('invalidToken', siteId, 0);
    } catch (error) {
      expect((error as WebflowError).message).toEqual('Could not retrieve users');
    }
  });
  test('should return nextPage when there are more users available', async () => {
    const result = await getUsers(validToken, siteId, 0);
    expect(result.pagination.next).equals(10);
  });

  test('should return nextPage as null when end of list is reached', async () => {
    const result = await getUsers(validToken, siteId, 20);
    expect(result.pagination.next).toBeNull();
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(
        `${env.WEBFLOW_API_BASE_URL}/v2/sites/${siteId}/users/${userId}`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 204 });
        }
      )
    );
  });

  test('should delete user successfully when token are valid', async () => {
    await expect(deleteUser(validToken, siteId, userId)).resolves.not.toThrow();
  });

  test('should throw WebflowError when token is invalid', async () => {
    try {
      await deleteUser('invalidToken', siteId, userId);
    } catch (error) {
      expect((error as WebflowError).message).toEqual(`Could not delete user with Id: ${userId}`);
    }
  });
});
