import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { LinearError, LinearNotAdminError } from '../common/error';
import type { LinearUser } from './users';
import { getUsers, deleteUser, getAuthUser } from './users';

const validToken = 'token-1234';
const endCursor = '2';
const nextCursor = '1';
const userId = 'test-id';

const authUserId = 'test-auth-user-id';
const workspaceUrlKey = 'workspace-url-key';

const validUsers: LinearUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  displayName: `first_name-${i}`,
  email: `user-${i}@foo.bar`,
  active: true,
  admin: false,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(`${env.LINEAR_API_BASE_URL}/graphql`, async ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          // @ts-expect-error -- convenience
          const data: { variables: { afterCursor: string } } = await request.json();
          const { afterCursor } = data.variables;

          return Response.json({
            data: {
              organization: {
                urlKey: workspaceUrlKey,
              },
              users: {
                nodes: [...validUsers, ...invalidUsers],
                pageInfo: {
                  hasNextPage: afterCursor !== endCursor,
                  endCursor: afterCursor !== endCursor ? nextCursor : null,
                },
              },
            },
          });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, afterCursor: 'start' })
      ).resolves.toStrictEqual({
        workspaceUrlKey,
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, afterCursor: endCursor })
      ).resolves.toStrictEqual({
        workspaceUrlKey,
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(LinearError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.post<{ userId: string }>(`${env.LINEAR_API_BASE_URL}/graphql`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 200 });
        })
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ accessToken: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ accessToken: validToken, userId })).resolves.toBeUndefined();
    });

    test('should throw LinearError when token is invalid', async () => {
      await expect(deleteUser({ accessToken: 'invalidToken', userId })).rejects.toBeInstanceOf(
        LinearError
      );
    });
  });

  const setup = (
    {
      hasAdminRole,
    }: {
      hasAdminRole: boolean;
    } = {
      hasAdminRole: true,
    }
  ) => {
    server.use(
      http.post(`${env.LINEAR_API_BASE_URL}/graphql`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        return Response.json({
          data: {
            viewer: { id: authUserId, admin: hasAdminRole, active: true },
          },
        });
      })
    );
  };
  describe('getAuthUser', () => {
    test('should return authUserId and workspace url when the token is valid', async () => {
      setup();
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({
        authUserId,
      });
    });
    test('should throw error when the auth user is not an admin', async () => {
      setup({
        hasAdminRole: false,
      });
      await expect(getAuthUser(validToken)).rejects.toBeInstanceOf(LinearNotAdminError);
    });

    test('should throws when the token is invalid', async () => {
      setup();
      await expect(getAuthUser('foo-bar')).rejects.toBeInstanceOf(LinearError);
    });
  });
});
