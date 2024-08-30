import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { HarvestError } from '../common/error';
import type { HarvestUser } from './users';
import { getUsers, deleteUser, getOwnerId, getCompanyDomain } from './users';

const validToken = 'token-1234';
const userId = 'test-user-id';
const ownerId = 100000;
const companyDomain = 'test-company-domain';
const endPage = 'https://api.harvestapp.com/v2/users?page=3&per_page=2000&ref=last';
const nextPage =
  'https://api.harvestapp.com/v2/users?cursor=eyJhZnRlciI6eyJpZCI6NDAwN319&per_page=2000&ref=next_cursor';

const validUsers: HarvestUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  email: `user-${i}@foo.bar`,
  access_roles: ['member'],
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.HARVEST_API_BASE_URL}/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const cursor = url.searchParams.get('cursor');
          const responseData = cursor
            ? { users: validUsers, links: { next: nextPage } }
            : { users: validUsers, links: { next: null } };
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
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(HarvestError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.patch<{ userId: string }>(
          `${env.HARVEST_API_BASE_URL}/users/:userId`,
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
      await expect(deleteUser({ accessToken: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ accessToken: validToken, userId })).resolves.toBeUndefined();
    });

    test('should throw HarvestError when token is invalid', async () => {
      await expect(deleteUser({ accessToken: 'invalidToken', userId })).rejects.toBeInstanceOf(
        HarvestError
      );
    });
  });

  describe('getOwnerId', () => {
    beforeEach(() => {
      server.use(
        http.get<{ userId: string }>(`${env.HARVEST_API_BASE_URL}/users/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({ id: ownerId });
        })
      );
    });

    test('should return owner id successfully when token is valid', async () => {
      await expect(getOwnerId({ accessToken: validToken })).resolves.not.toThrow();
    });

    test('should throw HarvestError when token is invalid', async () => {
      await expect(getOwnerId({ accessToken: 'invalidToken' })).rejects.toBeInstanceOf(
        HarvestError
      );
    });
  });

  describe('getCompanyDomain', () => {
    beforeEach(() => {
      server.use(
        http.get<{ userId: string }>(`${env.HARVEST_API_BASE_URL}/company`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({ full_domain: companyDomain });
        })
      );
    });

    test('should return company domain successfully when token is valid', async () => {
      await expect(getCompanyDomain({ accessToken: validToken })).resolves.not.toThrow();
    });

    test('should throw HarvestError when token is invalid', async () => {
      await expect(getCompanyDomain({ accessToken: 'invalidToken' })).rejects.toBeInstanceOf(
        HarvestError
      );
    });
  });
});
