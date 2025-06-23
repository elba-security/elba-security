import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';
import type { TableauUser } from './users';
import { getAuthUser, getUsers, deleteUser } from './users';

const validToken = 'valid-tableau-token';
const serverUrl = 'https://tableau.example.com';
const siteId = 'test-site-id';

const validUsers: TableauUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `user-${i}`,
  name: `user${i}`,
  fullName: `User ${i}`,
  email: `user${i}@example.com`,
  siteRole: i === 0 ? 'SiteAdministratorCreator' : 'Viewer',
  authSetting: 'ServerDefault',
}));

const createTableauResponse = (users: TableauUser[], page: number, totalUsers: number) => ({
  user: users,
  pagination: {
    pageNumber: String(page),
    pageSize: String(env.TABLEAU_USERS_SYNC_BATCH_SIZE),
    totalAvailable: String(totalUsers),
  },
});

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${serverUrl}/api/3.15/sites/${siteId}/users`, ({ request }) => {
          if (request.headers.get('X-Tableau-Auth') !== validToken) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const pageNumber = parseInt(url.searchParams.get('pageNumber') || '1', 10);
          const _pageSize = parseInt(url.searchParams.get('pageSize') || '100', 10);

          if (pageNumber === 1) {
            // First page: 1 user (batch size is 1)
            const firstUser = validUsers[0];
            if (!firstUser) throw new Error('Missing test user');
            return Response.json(createTableauResponse([firstUser], 1, 2));
          }

          if (pageNumber === 2) {
            // Last page: 1 user
            const secondUser = validUsers[1];
            if (!secondUser) throw new Error('Missing test user');
            return Response.json(createTableauResponse([secondUser], 2, 2));
          }

          return new Response(undefined, { status: 404 });
        })
      );
    });

    test('should return users and nextPage when there are more pages', async () => {
      await expect(
        getUsers({ serverUrl, siteId, accessToken: validToken, page: null })
      ).resolves.toStrictEqual({
        validUsers: [
          {
            id: 'user-0',
            name: 'user0',
            fullName: 'User 0',
            email: 'user0@example.com',
            siteRole: 'SiteAdministratorCreator',
            authSetting: 'ServerDefault',
          },
        ],
        invalidUsers: [],
        nextPage: '2',
      });
    });

    test('should return users and no nextPage on last page', async () => {
      await expect(
        getUsers({ serverUrl, siteId, accessToken: validToken, page: '2' })
      ).resolves.toStrictEqual({
        validUsers: [
          {
            id: 'user-1',
            name: 'user1',
            fullName: 'User 1',
            email: 'user1@example.com',
            siteRole: 'Viewer',
            authSetting: 'ServerDefault',
          },
        ],
        invalidUsers: [],
        nextPage: null,
      });
    });

    test('should throw IntegrationConnectionError when unauthorized', async () => {
      await expect(
        getUsers({ serverUrl, siteId, accessToken: 'invalid-token', page: null })
      ).rejects.toThrow(new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' }));
    });

    test('should throw IntegrationError for other errors', async () => {
      await expect(
        getUsers({ serverUrl, siteId, accessToken: validToken, page: '999' })
      ).rejects.toBeInstanceOf(IntegrationError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete(
          `${serverUrl}/api/3.15/sites/${siteId}/users/:userId`,
          ({ request, params }) => {
            if (request.headers.get('X-Tableau-Auth') !== validToken) {
              return new Response(undefined, { status: 401 });
            }

            const userId = params.userId as string;

            if (userId === 'existing-user') {
              return new Response(undefined, { status: 204 });
            }

            if (userId === 'already-deleted-user') {
              return new Response(undefined, { status: 404 });
            }

            return new Response(undefined, { status: 500 });
          }
        )
      );
    });

    test('should successfully delete an existing user', async () => {
      await expect(
        deleteUser({
          serverUrl,
          siteId,
          accessToken: validToken,
          userId: 'existing-user',
        })
      ).resolves.toBeUndefined();
    });

    test('should not throw when user is already deleted (404)', async () => {
      await expect(
        deleteUser({
          serverUrl,
          siteId,
          accessToken: validToken,
          userId: 'already-deleted-user',
        })
      ).resolves.toBeUndefined();
    });

    test('should throw IntegrationError for other errors', async () => {
      await expect(
        deleteUser({
          serverUrl,
          siteId,
          accessToken: validToken,
          userId: 'error-user',
        })
      ).rejects.toBeInstanceOf(IntegrationError);
    });
  });

  describe('getAuthUser', () => {
    const setup = ({ siteRole }: { siteRole: string }) => {
      server.use(
        http.get(`${serverUrl}/api/3.15/sites/${siteId}/users/me`, ({ request }) => {
          if (request.headers.get('X-Tableau-Auth') !== validToken) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            user: {
              id: 'auth-user-id',
              name: 'authuser',
              fullName: 'Auth User',
              email: 'auth@example.com',
              siteRole,
              authSetting: 'ServerDefault',
            },
          });
        })
      );
    };

    test('should successfully retrieve admin user', async () => {
      setup({ siteRole: 'SiteAdministratorCreator' });
      await expect(getAuthUser(serverUrl, siteId, validToken)).resolves.toStrictEqual({
        authUserId: 'auth-user-id',
        siteRole: 'SiteAdministratorCreator',
      });
    });

    test('should successfully retrieve server admin user', async () => {
      setup({ siteRole: 'ServerAdministrator' });
      await expect(getAuthUser(serverUrl, siteId, validToken)).resolves.toStrictEqual({
        authUserId: 'auth-user-id',
        siteRole: 'ServerAdministrator',
      });
    });

    test('should throw when user is not an admin', async () => {
      setup({ siteRole: 'Viewer' });
      await expect(getAuthUser(serverUrl, siteId, validToken)).rejects.toThrow(
        new IntegrationConnectionError('Authenticated user is not an administrator', {
          type: 'not_admin',
          metadata: {
            user: {
              id: 'auth-user-id',
              name: 'authuser',
              fullName: 'Auth User',
              email: 'auth@example.com',
              siteRole: 'Viewer',
              authSetting: 'ServerDefault',
            },
          },
        })
      );
    });

    test('should throw IntegrationConnectionError when unauthorized', async () => {
      setup({ siteRole: 'SiteAdministratorCreator' });
      await expect(getAuthUser(serverUrl, siteId, 'invalid-token')).rejects.toThrow(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });
  });
});
