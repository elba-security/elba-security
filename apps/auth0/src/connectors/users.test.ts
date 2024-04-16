import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { deleteUser, getUsers } from './users';
import type { Auth0Error } from './commons/error';
import { users } from './__mocks__/users';

const validToken = 'valid-token';
const userId = 'test-user-id';
const domain = 'test-domain';

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://${domain}/api/v2/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '0');
        const lastIndex = 20; //assumed last user index to be 20
        return new Response(JSON.stringify(page === lastIndex ? users.slice(0, -1) : users), {
          status: 200,
        });
      })
    );
  });

  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, domain, 0);
    expect(result.users).toEqual(users);
  });

  test('should throw Auth0Error when token is invalid', async () => {
    try {
      await getUsers('invalidToken', domain, 0);
    } catch (error) {
      expect((error as Auth0Error).message).toEqual('Could not retrieve auth0 users');
    }
  });

  test('should return next page as null when end of list is reached', async () => {
    const result = await getUsers(validToken, domain, 20);
    expect(result.pagination.nextPage).toEqual(null);
  });

  test('should return next page when there is next page', async () => {
    const result = await getUsers(validToken, domain, 0);
    expect(result.pagination.nextPage).toEqual(10);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(`https://${domain}/api/v2/users/${userId}`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(undefined, { status: 200 });
      })
    );
  });

  test('should delete user successfully when token is valid', async () => {
    await expect(deleteUser(validToken, domain, userId)).resolves.not.toThrow();
  });

  test('should throw Auth0Error when token is invalid', async () => {
    try {
      await deleteUser('invalidToken', domain, userId);
    } catch (error) {
      expect((error as Auth0Error).message).toEqual(`Could not delete user with Id: ${userId}`);
    }
  });
});
