import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env/server';
import { AircallError } from '../common/error';
import type { AircallUser } from './users';
import { deleteUser, getUsers, getAuthUser } from './users';

const userId = 'user-1234';
const validToken = 'token-1234';
const nextPageLink = `${env.AIRCALL_API_BASE_URL}/v1/users?page=2`;
const authUserId = 12345;

const validUsers: AircallUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  name: `name-${i}`,
  availability_status: 'available',
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.AIRCALL_API_BASE_URL}/v1/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const page = url.searchParams.get('page');

          const returnData = {
            users: validUsers,
            meta: {
              next_page_link: page ? nextPageLink : null,
            },
          };

          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ token: validToken, nextPageLink })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPageLink,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ token: validToken, nextPageLink: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ token: 'foo-bar', nextPageLink })).rejects.toBeInstanceOf(
        AircallError
      );
    });
  });

  const setup = ({ hasInvalidUser = false }: { hasInvalidUser?: boolean }) => {
    server.use(
      http.delete<{ userId: string }>(
        `${env.AIRCALL_API_BASE_URL}/v1/users/${hasInvalidUser ? 'invalid' : userId}`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const pathName = url.pathname.split('/');

          if (pathName.at(3) !== userId) {
            return new Response(undefined, { status: 404 });
          }

          return new Response(undefined, { status: 200 });
        }
      )
    );
  };

  describe('deleteUser', () => {
    test('should delete user successfully when token is valid', async () => {
      setup({});
      await expect(deleteUser({ token: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw error when the user is not found', async () => {
      setup({
        hasInvalidUser: true,
      });
      await expect(deleteUser({ token: validToken, userId: 'invalid' })).resolves.not.toThrow();
    });

    test('should throw AircallError when token is invalid', async () => {
      setup({});
      await expect(deleteUser({ token: 'invalidToken', userId })).rejects.toBeInstanceOf(
        AircallError
      );
    });
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.AIRCALL_API_BASE_URL}/v1/integrations/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const returnData = {
            integration: {
              user: {
                id: authUserId,
              },
            },
          };

          return Response.json(returnData);
        })
      );
    });

    test('should return auth user id when the token is valid', async () => {
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({
        authUserId: String(authUserId),
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getAuthUser('foo-bar')).rejects.toBeInstanceOf(AircallError);
    });
  });
});
