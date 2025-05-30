import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { FifteenFiveError } from '../common/error';
import { type FifteenFiveUser, getUsers, deleteUser, checkUserWithEmail } from './users';

const nextCursor = 'https://api.15five.com/api/public/user/?is_active=true&page=2&page_size=1';
const apiKey = 'test-api-key';
const userId = 'test-user-id';
const authUserEmail = 'test-owner-email';

const validUsers: FifteenFiveUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: i,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.FIFTEENFIVE_API_BASE_URL}/api/public/user`, ({ request }) => {
          if (request.headers.get('Authorization') !== apiKey) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const returnData = {
            results: validUsers,
            next: page ? nextCursor : null,
          };
          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the apiKey is valid and if their is another page', async () => {
      await expect(getUsers({ apiKey, nextPageUrl: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the apiKey is valid if and their is no other page', async () => {
      await expect(getUsers({ apiKey, nextPageUrl: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the apiKey is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          nextPageUrl: nextCursor,
        })
      ).rejects.toBeInstanceOf(FifteenFiveError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.put<{ userId: string }>(
          `${env.FIFTEENFIVE_API_BASE_URL}/api/public/user/:userId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== apiKey) {
              return new Response(undefined, { status: 401 });
            }

            if (params.userId !== userId) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when apiKey is valid', async () => {
      await expect(deleteUser({ apiKey, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ apiKey, userId })).resolves.toBeUndefined();
    });

    test('should throw FifteenFiveError when apiKey is invalid', async () => {
      await expect(deleteUser({ apiKey: 'invalidKey', userId })).rejects.toBeInstanceOf(
        FifteenFiveError
      );
    });
  });

  describe('checkUserWithEmail', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.FIFTEENFIVE_API_BASE_URL}/api/public/user`, ({ request }) => {
          if (request.headers.get('Authorization') !== apiKey) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const email = url.searchParams.get('email');
          const returnData = {
            results: email === authUserEmail ? validUsers : [],
            next: null,
          };
          return Response.json(returnData);
        })
      );
    });

    test('should return true when the apiKey is valid and the email is the one of the owner', async () => {
      await expect(checkUserWithEmail({ apiKey, authUserEmail })).resolves.toStrictEqual({
        isValidEmail: true,
      });
    });

    test('should return false and no nextPage when the apiKey is valid and their is no other page', async () => {
      await expect(
        checkUserWithEmail({ apiKey, authUserEmail: 'invalid-email' })
      ).resolves.toStrictEqual({
        isValidEmail: false,
      });
    });

    test('should throws when the apiKey is invalid', async () => {
      await expect(
        checkUserWithEmail({
          apiKey: 'foo-id',
          authUserEmail,
        })
      ).rejects.toBeInstanceOf(FifteenFiveError);
    });
  });
});
