import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { MetabaseError } from '../common/error';
import type { MetabaseUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const endPageOffset = 2;
const nextPageOffset = 1;
const limit = 1;
const total = 3;
const domain = 'test-domain';
const userId = 'test-user-id';

const validUsers: MetabaseUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  email: `user-${i}@foo.bar`,
  is_superuser: true,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`https://${domain}.metabaseapp.com/api/user`, ({ request }) => {
          if (request.headers.get('x-api-key') !== validToken) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const offset = url.searchParams.get('offset') || '0';
          const responseData = {
            data: validUsers,
            offset: parseInt(offset, 10),
            limit,
            total,
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ apiKey: validToken, page: nextPageOffset, domain })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPageOffset + limit,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ apiKey: validToken, page: endPageOffset, domain })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ apiKey: 'foo-bar', domain, page: 0 })).rejects.toBeInstanceOf(
        MetabaseError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `https://${domain}.metabaseapp.com/api/user/${userId}`,
          ({ request }) => {
            if (request.headers.get('x-api-key') !== validToken) {
              return new Response(undefined, { status: 401 });
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ apiKey: validToken, userId, domain })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ apiKey: validToken, userId, domain })).resolves.toBeUndefined();
    });

    test('should throw MetabaseError when token is invalid', async () => {
      await expect(deleteUser({ apiKey: 'invalidToken', userId, domain })).rejects.toBeInstanceOf(
        MetabaseError
      );
    });
  });
});
