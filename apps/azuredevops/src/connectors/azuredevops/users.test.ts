import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { AzuredevopsError } from '../common/error';
import type { AzuredevopsUser } from './users';
import { getUsers, deleteUser, getAuthUser, checkWorkspaceSetting } from './users';

const validToken = 'token-1234';
const workspaceId = '00000000-0000-0000-0000-000000000001';
const userId = 'test-user-id';
const nextContinuationToken = 'test-token';
const authUserEmail = 'test@gmail.com';
const validUsers: AzuredevopsUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `user${i}`,
  user: {
    mailAddress: `user${i}@gmail.com`,
    displayName: `user${i}-displayName`,
    origin: 'msa',
    subjectKind: 'user',
  },
  accessLevel: {
    status: 'active',
  },
}));

const invalidUsers = [];

const setup = ({ hasNextPage = true }: { hasNextPage?: boolean }) => {
  server.use(
    http.get(
      `${env.AZUREDEVOPS_API_BASE_URL}/${workspaceId}/_apis/userentitlements`,
      ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        const returnData = {
          items: validUsers,
          continuationToken: hasNextPage ? nextContinuationToken : null,
        };

        return Response.json(returnData);
      }
    )
  );
};
describe('users connector', () => {
  describe('getUsers', () => {
    setup({ hasNextPage: true });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, workspaceId, page: null })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextContinuationToken,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      setup({ hasNextPage: false });
      await expect(
        getUsers({
          accessToken: validToken,
          workspaceId,
          page: null,
        })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should handle the next page cursor and return the users', async () => {
      setup({ hasNextPage: false });

      await expect(
        getUsers({ accessToken: validToken, workspaceId, page: nextContinuationToken })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      setup({ hasNextPage: false });
      await expect(getUsers({ accessToken: 'foo-bar', workspaceId })).rejects.toBeInstanceOf(
        AzuredevopsError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.AZUREDEVOPS_API_BASE_URL}/${workspaceId}/_apis/userentitlements/${userId}`,
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
        deleteUser({ accessToken: validToken, userId, workspaceId })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validToken, userId, workspaceId })
      ).resolves.toBeUndefined();
    });

    test('should throw AzuredevopsError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', userId, workspaceId })
      ).rejects.toBeInstanceOf(AzuredevopsError);
    });
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.AZUREDEVOPS_APP_INSTALL_URL}/_apis/profile/profiles/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const returnData = {
            emailAddress: authUserEmail,
          };

          return Response.json(returnData);
        })
      );
    });

    test('should return auth user id when the token is valid', async () => {
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({
        authUserEmail,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getAuthUser('foo-bar')).rejects.toBeInstanceOf(AzuredevopsError);
    });
  });

  describe('checkWorkspaceSetting', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `${env.AZUREDEVOPS_API_BASE_URL}/${workspaceId}/_apis/userentitlements`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            const returnData = {
              value: validUsers,
            };

            return Response.json(returnData);
          }
        )
      );
    });

    test('should return true when the response is successful', async () => {
      await expect(
        checkWorkspaceSetting({ accessToken: validToken, workspaceId })
      ).resolves.toStrictEqual({
        hasValidSecuritySettings: true,
      });
    });

    test('should  return false when the response is unsuccessful', async () => {
      await expect(
        checkWorkspaceSetting({ accessToken: 'foo-bar', workspaceId })
      ).resolves.toStrictEqual({
        hasValidSecuritySettings: false,
      });
    });
  });
});
