import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { ZoomError, ZoomNotAdminError } from '../common/error';
import type { ZoomUser } from './users';
import { getUsers, deactivateUser, getAuthUser } from './users';

const validToken = 'token-1234';
const endPage = '2';
const nextPage = '1';
const userId = 'test-id';

const validUsers: ZoomUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  display_name: `display_name-${i}`,
  email: `user-${i}@foo.bar`,
  role_id: '2',
  status: 'active',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.ZOOM_API_BASE_URL}/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const after = url.searchParams.get('next_page_token');
          return Response.json({
            users: validUsers,
            next_page_token: after === endPage ? null : after,
          });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ accessToken: validToken, page: nextPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ accessToken: validToken, page: endPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(ZoomError);
    });
  });

  describe('deactivateUser', () => {
    beforeEach(() => {
      server.use(
        http.put<{ userId: string }>(
          `${env.ZOOM_API_BASE_URL}/users/:userId/status`,
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
      await expect(deactivateUser({ accessToken: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deactivateUser({ accessToken: validToken, userId: 'invalid' })
      ).resolves.not.toThrow();
    });

    test('should throw ZoomError when token is invalid', async () => {
      await expect(deactivateUser({ accessToken: 'invalidToken', userId })).rejects.toBeInstanceOf(
        ZoomError
      );
    });
  });

  const setup = (
    { hasValidUserRole }: { hasValidUserRole: boolean } = { hasValidUserRole: true }
  ) => {
    server.use(
      http.get(`${env.ZOOM_API_BASE_URL}/users/me`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        return Response.json({
          id: 'current-auth-user-id',
          role_name: hasValidUserRole ? 'Admin' : 'User',
        });
      })
    );
  };

  describe('getAuthUsers', () => {
    test('should return the current authenticated user', async () => {
      setup();
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({
        authUserId: 'current-auth-user-id',
      });
    });

    test('should throw error when the auth user is not an admin or owner', async () => {
      setup({
        hasValidUserRole: false,
      });
      await expect(getAuthUser(validToken)).rejects.toBeInstanceOf(ZoomNotAdminError);
    });

    test('should throws when the token is invalid', async () => {
      setup();
      await expect(getAuthUser('foo-bar')).rejects.toBeInstanceOf(ZoomError);
    });
  });
});
