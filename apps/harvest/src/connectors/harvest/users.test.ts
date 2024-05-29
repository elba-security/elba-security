/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { HarvestError } from '../common/error';
import type { HarvestUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const endPageCursor = 'https://api.harvestapp.com/v2/users?page=3&per_page=2000&ref=last';
const nextCursor =
  'https://api.harvestapp.com/v2/users?cursor=eyJhZnRlciI6eyJpZCI6NDAwN319&per_page=2000&ref=next_cursor';
const userId = 'test-user1-id';
const accountId = '000000';

const validUsers: HarvestUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  email: `user-${i}@foo.bar`,
  access_roles: ['administrator'],
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
            ? { users: validUsers, links: { next: nextCursor } }
            : { users: validUsers, links: { next: null } };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, accountId, cursor: nextCursor })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, accountId, cursor: endPageCursor })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', accountId })).rejects.toBeInstanceOf(
        HarvestError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
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
      await expect(
        deleteUser({ accessToken: validToken, accountId, userId })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validToken, accountId, userId })
      ).resolves.toBeUndefined();
    });

    test('should throw HarvestError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', accountId, userId })
      ).rejects.toBeInstanceOf(HarvestError);
    });
  });
});
