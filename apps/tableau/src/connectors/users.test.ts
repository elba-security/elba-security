import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { type TableauUser, getUsers } from './users';
import { TableauError } from './commons/error';

const validToken = 'token-1234';
const domain = 'https://test.tableau.com';
const siteId = 'site-1234';

const invalidUsers = [
  {
    email: `user-invalid@foo.bar`,
    fullName: `user-invalid`,
    siteRole: `userRole-invalid`,
  },
];

const validUsers: TableauUser[] = Array.from({ length: 50 - invalidUsers.length }, (_, i) => ({
  id: `user-id-${i}`,
  email: `user-${i}@foo.bar`,
  fullName: `user-${i}`,
  siteRole: `userRole-${i}`,
}));

const users = [...invalidUsers, ...validUsers];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${domain}/api/3.22/sites/${siteId}/users`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('X-Tableau-Auth') !== validToken) {
            return new Response(undefined, { status: 401 });
          }
          const requestedUrl = new URL(request.url);
          const pageParam = requestedUrl.searchParams.get('pageNumber');
          const pageSize = requestedUrl.searchParams.get('pageSize');
          const page = pageParam ? Number(pageParam) : 1;

          return Response.json({
            pagination: {
              pageNumber: page.toString(),
              pageSize,
              totalAvailable: users
                .slice((page - 1) * Number(pageSize), page * Number(pageSize))
                .length.toString(),
            },
            users: {
              user: users.slice(0, pageSize ? Number(pageSize) : 100), //Default value for Tableau is 100
            },
          });
        })
      );
    });

    test('should return users and nextPage should be incremented by 1', async () => {
      await expect(
        getUsers({ token: validToken, domain, siteId, page: '1' })
      ).resolves.toStrictEqual({
        validUsers: validUsers.slice(0, Number(env.TABLEAU_USERS_SYNC_BATCH_SIZE) - 1),
        invalidUsers,
        nextPage: '2',
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ token: validToken, domain, siteId, page: '6' })
      ).resolves.toStrictEqual({
        validUsers: validUsers.slice(0, Number(env.TABLEAU_USERS_SYNC_BATCH_SIZE) - 1),
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({ token: 'foo-bar', domain, siteId, page: '0' })
      ).rejects.toBeInstanceOf(TableauError);
    });
  });
});
