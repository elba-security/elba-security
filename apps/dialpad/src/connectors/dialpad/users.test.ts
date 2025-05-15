import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { DialpadError } from '../common/error';
import type { DialpadUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const endPageCursor = 'endPage-cursor';
const nextPageCursor = 'nextPage-cursor';
const userId = 'test-user-id';

const validUsers: DialpadUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  first_name: `firstName-${i}`,
  last_name: `lastName-${i}`,
  emails: [`user-${i}@foo.bar`],
  is_super_admin: false,
  state: 'active',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.DIALPAD_API_BASE_URL}/api/v2/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const cursor = url.searchParams.get('cursor') || '0';
          const responseData =
            cursor === endPageCursor
              ? {
                  items: validUsers,
                }
              : {
                  items: validUsers,
                  cursor: nextPageCursor,
                };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: nextPageCursor })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPageCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: endPageCursor })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(DialpadError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.patch<{ userId: string }>(
          `${env.DIALPAD_API_BASE_URL}/api/v2/users/${userId}`,
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

    test('should throw DialpadError when token is invalid', async () => {
      await expect(deleteUser({ accessToken: 'invalidToken', userId })).rejects.toBeInstanceOf(
        DialpadError
      );
    });
  });
});
