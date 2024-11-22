import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env/server';
import { AsanaError } from '../common/error';
import type { AsanaUser } from './users';
import { getUsers, deleteUser, getAuthUser, getWorkspaceIds } from './users';

const validToken = 'token-1234';
const endPage = '3';
const nextPage = '2';
const userId = 'test-user-id';
const workspaceId = '000000';
const invalidToken = 'invalid-token';
const authUserId = 'test-auth-user-id';

const validUsers: AsanaUser[] = Array.from({ length: 5 }, (_, i) => ({
  gid: `gid-${i}`,
  name: `first_name-${i}`,
  email: `user-${i}@foo.bar`,
  is_active: true,
  resource_type: 'user',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.ASANA_API_BASE_URL}/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const offset = url.searchParams.get('offset');
          const responseData =
            offset === endPage
              ? { data: validUsers }
              : { data: validUsers, next_page: { offset: nextPage } };
          return Response.json(responseData);
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
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(AsanaError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.post<{ userId: string }>(
          `${env.ASANA_API_BASE_URL}/workspaces/:workspaceId/removeUser`,
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
      await expect(
        deleteUser({ accessToken: validToken, workspaceId, userId })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validToken, workspaceId, userId })
      ).resolves.toBeUndefined();
    });

    test('should throw AsanaError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', workspaceId, userId })
      ).rejects.toBeInstanceOf(AsanaError);
    });
  });

  describe('getWorkspaceIds', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.ASANA_API_BASE_URL}/workspaces`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            data: [
              {
                gid: workspaceId,
              },
            ],
          });
        })
      );
    });

    test('should return the workspaceIds when the accessToken is valid', async () => {
      await expect(getWorkspaceIds(validToken)).resolves.toStrictEqual([workspaceId]);
    });

    test('should throw when the accessToken is invalid', async () => {
      await expect(getWorkspaceIds(invalidToken)).rejects.toBeInstanceOf(AsanaError);
    });
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.ASANA_API_BASE_URL}/users/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const responseData = {
            data: {
              gid: authUserId,
            },
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({
        authUserId,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getAuthUser(invalidToken)).rejects.toBeInstanceOf(AsanaError);
    });
  });
});
