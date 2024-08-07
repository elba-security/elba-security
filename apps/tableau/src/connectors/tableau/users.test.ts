import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { TableauError } from '../commons/error';
import { type TableauUser, getUsers } from './users';

const validToken = 'token-1234';
const domain = 'test.tableau.com';
const siteId = 'site-1234';

const invalidUser = {
  email: `user-invalid@foo.bar`,
  fullName: `user-invalid`,
  siteRole: `userRole-invalid`,
};

const validUser: TableauUser = {
  id: 'user-id',
  email: 'user@foo.bar',
  fullName: 'user',
  siteRole: 'userRole',
};

const users = [invalidUser, validUser];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`https://${domain}/api/3.22/sites/${siteId}/users`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('X-Tableau-Auth') !== validToken) {
            return new Response(undefined, { status: 401 });
          }
          const requestedUrl = new URL(request.url);
          const pageParam = requestedUrl.searchParams.get('pageNumber');
          const page = pageParam || '1';

          if (page === '1') {
            return Response.json({
              pagination: {
                pageNumber: page,
              },
              users: {
                user: users,
              },
            });
          }

          return Response.json({ error: { code: '400006' } }, { status: 400 });
        })
      );
    });

    test('should return users and nextPage should be incremented by 1', async () => {
      await expect(
        getUsers({ token: validToken, domain, siteId, page: '1' })
      ).resolves.toStrictEqual({
        validUsers: [validUser],
        invalidUsers: [invalidUser],
        nextPage: '2',
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ token: validToken, domain, siteId, page: '6' })
      ).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers: [],
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
