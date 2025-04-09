import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { OutreachError } from '../common/error';
import type { OutreachUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const endPageOffset = '3';
const nextPageUrl = 'https://api.outreach.io/api/v2/users?page[size]=2';
const endPageUrl = 'https://api.outreach.io/api/v2/users?page[size]=3';
const userId = 'test-user-id';

const validUsers: OutreachUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  attributes: {
    firstName: `firstName-${i}`,
    lastName: `lastName-${i}`,
    email: `user-${i}@foo.bar`,
    locked: false,
  },
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.OUTREACH_API_BASE_URL}/api/v2/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const offset = url.searchParams.get('page[size]') || '0';
          const responseData = {
            data: validUsers,
            links: offset !== endPageOffset ? { next: nextPageUrl } : {},
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ accessToken: validToken, page: nextPageUrl })).resolves.toStrictEqual(
        {
          validUsers,
          invalidUsers,
          nextPage: nextPageUrl,
        }
      );
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ accessToken: validToken, page: endPageUrl })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(OutreachError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.patch<{ userId: string }>(
          `${env.OUTREACH_API_BASE_URL}/api/v2/users/${userId}`,
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

    test('should throw OutreachError when token is invalid', async () => {
      await expect(deleteUser({ accessToken: 'invalidToken', userId })).rejects.toBeInstanceOf(
        OutreachError
      );
    });
  });
});
