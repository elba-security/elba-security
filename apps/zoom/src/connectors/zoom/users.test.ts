import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';
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

    test('should throw when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'invalid-token' })).rejects.toStrictEqual(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
        new IntegrationError('Could not retrieve users', { response: expect.any(Response) })
      );
    });
  });

  describe('getAuthUser', () => {
    const setup = ({ isAdmin }: { isAdmin: boolean }) => {
      server.use(
        http.get(`${env.ZOOM_API_BASE_URL}/users/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            id: 'current-auth-user-id',
            role_name: isAdmin ? 'Admin' : 'User',
          });
        })
      );
    };

    test('should return the current authenticated user', async () => {
      setup({ isAdmin: true });
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({
        authUserId: 'current-auth-user-id',
      });
    });

    test('should throw when the authenticated user is not an admin or owner', async () => {
      setup({ isAdmin: false });
      await expect(getAuthUser(validToken)).rejects.toStrictEqual(
        new IntegrationConnectionError('Authenticated user is not owner or admin', {
          type: 'not_admin',
          metadata: { id: 'current-auth-user-id', role_name: 'User' },
        })
      );
    });

    test('should throw when the token is invalid', async () => {
      setup({ isAdmin: false });
      await expect(getAuthUser('invalid-token')).rejects.toStrictEqual(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
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

    test('should throw IntegrationError when token is invalid', async () => {
      await expect(deactivateUser({ accessToken: 'invalidToken', userId })).rejects.toStrictEqual(
        new IntegrationError('Could not deactivate user with Id: test-id', {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          response: expect.any(Response),
        })
      );
    });
  });
});
