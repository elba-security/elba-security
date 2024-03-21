import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers } from './users';
import type { WebflowError } from './commons/error';
import { users, usersResponse } from './__mocks__/users';

const validToken = 'valid-token';
const siteId = 'test-site-id';
const maxUsers = 20;

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://api.webflow.com/v2/sites/${siteId}/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const offset = parseInt(url.searchParams.get('offset') || '0');
        return new Response(
          JSON.stringify({
            users: usersResponse,
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
