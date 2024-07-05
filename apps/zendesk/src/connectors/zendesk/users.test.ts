import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { ZendeskError } from '../common/error';
import type { ZendeskUser } from './users';
import { getUsers, deleteUser, getOwnerId } from './users';

const validToken = 'token-1234';
const userId = 'test-user-id';
const ownerId = 10000000;
const endPage = 'end-page';
const endPageLink = `https://some-subdomain/api/v2/users?page=${endPage}&per_page=1&role%5B%5D=admin&role%5B%5D=agent`;
const nextPageLink =
  'https://some-subdomain/api/v2/users?page=2&per_page=1&role%5B%5D=admin&role%5B%5D=agent';
const subDomain = 'https://some-subdomain';

const validUsers: ZendeskUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
  active: true,
  suspended: false,
  role: 'admin',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${subDomain}/api/v2/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const responseData = {
            users: validUsers,
            next_page: page === endPage ? null : nextPageLink,
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: nextPageLink, subDomain })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPageLink,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: endPageLink, subDomain })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', subDomain })).rejects.toBeInstanceOf(
        ZendeskError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.put<{ userId: string }>(`${subDomain}/api/v2/users/${userId}`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 200 });
        })
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(
        deleteUser({ accessToken: validToken, userId, subDomain })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validToken, userId, subDomain })
      ).resolves.toBeUndefined();
    });

    test('should throw ZendeskError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', userId, subDomain })
      ).rejects.toBeInstanceOf(ZendeskError);
    });
  });
  describe('getOwnerId', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${subDomain}/api/v2/account`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const responseData = {
            account: {
              owner_id: ownerId,
            },
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return ownerId when the token is valid', async () => {
      await expect(getOwnerId({ accessToken: validToken, subDomain })).resolves.toStrictEqual({
        ownerId: String(ownerId),
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getOwnerId({ accessToken: 'foo-bar', subDomain })).rejects.toBeInstanceOf(
        ZendeskError
      );
    });
  });
});
