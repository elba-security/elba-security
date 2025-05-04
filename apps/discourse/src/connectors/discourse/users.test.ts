import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { DiscourseError } from '../common/error';
import type { DiscourseUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const endPageOffset = '3';
const nextPageOffset = '2';
const userId = 'test-user-id';

const validUsers: DiscourseUser[] = Array.from({ length: 5 }, (_, i) => ({
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
        http.get(`${env.DISCOURSE_API_BASE_URL}/users`, ({ request }) => {
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
      await expect(getUsers({ apiKey: validToken, page: nextPageOffset })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: parseInt(nextPageOffset, 10) + 1,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey: validToken, page: endPageOffset })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ apiKey: 'foo-bar' })).rejects.toBeInstanceOf(DiscourseError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.DISCOURSE_API_BASE_URL}/users/${userId}`,
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
      await expect(deleteUser({ apiKey: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ apiKey: validToken, userId })).resolves.toBeUndefined();
    });

    test('should throw DiscourseError when token is invalid', async () => {
      await expect(deleteUser({ apiKey: 'invalidToken', userId })).rejects.toBeInstanceOf(
        DiscourseError
      );
    });
  });
});
