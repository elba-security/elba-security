import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { PagerdutyError } from '../common/error';
import type { PagerdutyUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const endPageOffset = '3';
const nextPageOffset = '2';
const userId = 'test-user-id';

const validUsers: PagerdutyUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `userName-${i}`,
  role: 'owner',
  email: `user-${i}@foo.bar`,
  invitation_sent: false,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.PAGERDUTY_API_BASE_URL}users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const offset = url.searchParams.get('offset') || '0';
          const responseData = {
            users: validUsers,
            offset: parseInt(offset, 10),
            more: offset !== endPageOffset,
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: nextPageOffset })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: parseInt(nextPageOffset, 10) + 1,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: endPageOffset })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(PagerdutyError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.PAGERDUTY_API_BASE_URL}users/${userId}`,
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

    test('should throw PagerdutyError when token is invalid', async () => {
      await expect(deleteUser({ accessToken: 'invalidToken', userId })).rejects.toBeInstanceOf(
        PagerdutyError
      );
    });
  });
});
