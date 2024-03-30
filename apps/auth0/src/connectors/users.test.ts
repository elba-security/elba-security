import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { deleteUser, getUsers } from './users';
import type { Auth0Error } from './commons/error';
import { users } from './__mocks__/users';

const validToken = 'valid-token';
const organizationId = 'test-organization-id';
const userId = 'test-user-id';
const domain = 'test-domain';

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(
        `https://${domain}/api/v2/organizations/${organizationId}/members`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const page = url.searchParams.get('from') || 'current-page';
          const nextPage = 'next-page';
          const lastPage = 'last-page';
          return new Response(
            JSON.stringify({
              members: { users },
              next: page !== lastPage ? nextPage : undefined,
            }),
            { status: 200 }
          );
        }
      )
    );
  });

  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, domain, organizationId);
    expect(result.members).toEqual({ users });
  });

  test('should throw Auth0Error when token is invalid', async () => {
    try {
      await getUsers('invalidToken', domain, organizationId);
    } catch (error) {
      expect((error as Auth0Error).message).toEqual('Could not retrieve auth0 users');
    }
  });

  test('should return next page as undefined when end of list is reached', async () => {
    const result = await getUsers(validToken, domain, organizationId, 'last-page');
    expect(result.next).toBeUndefined();
  });

  test('should return next page when there is next page', async () => {
    const result = await getUsers(validToken, domain, organizationId, 'first-page');
    expect(result.next).toEqual('next-page');
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(
        `https://${domain}/api/v2/organizations/${organizationId}/members`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 200 });
        }
      )
    );
  });

  test('should delete user successfully when token is valid', async () => {
    await expect(deleteUser(validToken, domain, organizationId, userId)).resolves.not.toThrow();
  });

  test('should throw Auth0Error when token is invalid', async () => {
    try {
      await deleteUser('invalidToken', domain, organizationId, userId);
    } catch (error) {
      expect((error as Auth0Error).message).toEqual(`Could not delete user with Id: ${userId}`);
    }
  });
});
