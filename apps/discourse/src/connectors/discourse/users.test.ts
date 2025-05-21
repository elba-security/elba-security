import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { DiscourseError } from '../common/error';
import type { DiscourseUser } from './users';
import { getUsers, deleteUser } from './users';

const validApiKey = 'token-1234';
const endPage = 3;
const nextPage = 2;
const userId = '4';
const defaultHost = 'test-host';
const apiUsername = 'api-user-name';

const validUsers: DiscourseUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  username: `userName-${i}`,
  email: `user-${i}@foo.bar`,
  active: false,
  can_be_deleted: false,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `https://${defaultHost}.discourse.group/admin/users/list/active.json`,
          ({ request }) => {
            if (request.headers.get('Api-Key') !== validApiKey) {
              return new Response(undefined, { status: 401 });
            }

            const url = new URL(request.url);
            const page = url.searchParams.get('page') || '1';
            const responseData =
              parseInt(page, 10) !== endPage ? { users: validUsers } : { users: [] };
            return Response.json(responseData);
          }
        )
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ apiKey: validApiKey, defaultHost, apiUsername, page: nextPage })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPage + 1,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ apiKey: validApiKey, defaultHost, apiUsername, page: endPage })
      ).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({ apiKey: 'foo-bar', defaultHost, apiUsername, page: 1 })
      ).rejects.toBeInstanceOf(DiscourseError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.put<{ userId: string }>(
          `https://${defaultHost}.discourse.group/admin/users/${userId}/deactivate.json`,
          ({ request }) => {
            if (request.headers.get('Api-Key') !== validApiKey) {
              return new Response(undefined, { status: 401 });
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(
        deleteUser({ apiKey: validApiKey, defaultHost, apiUsername, userId })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ apiKey: validApiKey, defaultHost, apiUsername, userId })
      ).resolves.toBeUndefined();
    });

    test('should throw DiscourseError when token is invalid', async () => {
      await expect(
        deleteUser({ apiKey: 'invalidApiKey', defaultHost, apiUsername, userId })
      ).rejects.toBeInstanceOf(DiscourseError);
    });
  });
});
