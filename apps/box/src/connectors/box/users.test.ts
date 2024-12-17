import { http } from 'msw';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { BoxError, BoxNotAdminError } from '../common/error';
import type { BoxUser } from './users';
import { getUsers, deleteUser, getAuthUser } from './users';

const validToken = 'token-1234';
const nextPage = '1';
const userId = 'test-id';
const nextPageTotalCount = 30;
const limit = 20;
const totalCount = 1;
const authUserId = 'test-auth-user-id';
const invalidToken = 'foo-bar';

const validUsers: BoxUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `userName-${i}`,
  login: `user-${i}@foo.bar`,
  status: 'active',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.BOX_API_BASE_URL}/2.0/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const offset = url.searchParams.get('offset');

          const returnData = {
            entries: validUsers,
            offset: offset ? 1 : 0,
            limit,
            total_count: offset ? nextPageTotalCount : totalCount,
          };

          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ accessToken: validToken, nextPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: limit + 1,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ accessToken: validToken, nextPage: '' })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(BoxError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.put<{ userId: string }>(
          `${env.BOX_API_BASE_URL}/2.0/users/${userId}`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }
            if (params.userId !== userId) {
              return new Response(undefined, { status: 404 });
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ accessToken: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ accessToken: validToken, userId })).resolves.toBeUndefined();
    });

    test('should throw BoxError when token is invalid', async () => {
      await expect(deleteUser({ accessToken: 'invalidToken', userId })).rejects.toBeInstanceOf(
        BoxError
      );
    });
  });

  const setup = ({
    isAdmin = true,
  }: {
    isAdmin?: boolean;
  } = {}) => {
    server.use(
      http.get(`${env.BOX_API_BASE_URL}/2.0/users/me`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        const responseData = {
          id: authUserId,
          role: isAdmin ? 'admin' : 'user',
        };

        return Response.json(responseData);
      })
    );
  };

  describe('getAuthUser', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });
    test('should return the auth user details', async () => {
      setup();
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({
        authUserId,
      });
    });

    test('Should throw error when the user is not admin', async () => {
      setup({
        isAdmin: false,
      });
      await expect(getAuthUser(validToken)).rejects.toBeInstanceOf(BoxNotAdminError);
    });

    test('should throw error when the token is invalid', async () => {
      setup();
      await expect(getAuthUser(invalidToken)).rejects.toBeInstanceOf(BoxError);
    });
  });
});
