import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { BillError } from '../common/error';
import type { BillUser } from './users';
import { getUsers, deleteUser } from './users';

const devKey = 'dev-key';
const sessionId = 'session-id';
const endPageCursor = 'end-page-cursor';
const nextPageCursor = 'next-page-cursor';
const userId = 'test-user-id';

const validUsers: BillUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  email: `user-${i}@foo.bar`,
  archived: false,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.BILL_API_BASE_URL}/connect/v3/users`, ({ request }) => {
          if (
            request.headers.get('devKey') !== devKey ||
            request.headers.get('sessionId') !== sessionId
          ) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const page = url.searchParams.get('page') || '';
          const responseData =
            page !== endPageCursor
              ? {
                  results: validUsers,
                  nextPage: nextPageCursor,
                }
              : {
                  results: validUsers,
                };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ devKey, sessionId, page: nextPageCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPageCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ devKey, sessionId, page: endPageCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ devKey: 'foo-bar', sessionId })).rejects.toBeInstanceOf(BillError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.post<{ userId: string }>(
          `${env.BILL_API_BASE_URL}/users/${userId}/archive`,
          ({ request }) => {
            if (
              request.headers.get('devKey') !== devKey ||
              request.headers.get('sessionId') !== sessionId
            ) {
              return new Response(undefined, { status: 401 });
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ devKey, sessionId, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ devKey, sessionId, userId })).resolves.toBeUndefined();
    });

    test('should throw BillError when token is invalid', async () => {
      await expect(
        deleteUser({ devKey: 'invalidToken', sessionId, userId })
      ).rejects.toBeInstanceOf(BillError);
    });
  });
});
