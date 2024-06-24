import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { SalesforceError } from '../common/error';
import type { SalesforceUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const userId = 'test-id';
const offset = 0;
const limit = env.SALESFORCE_USERS_SYNC_BATCH_SIZE;
const lastOffset = 40;
const total = 25;
const instanceUrl = 'https://some-url';
const validUsers: SalesforceUser[] = Array.from({ length: 5 }, (_, i) => ({
  Id: `id-${i}`,
  Name: `name-${i}`,
  Email: `user-${i}@foo.bar`,
  IsActive: true,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${instanceUrl}/services/data/v60.0/query/`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const query = url.searchParams.get('q');
          const offsetMatch = query ? /offset\s+(?<offset>\d+)/i.exec(query) : null;
          const offsetValue = offsetMatch ? offsetMatch[1] : null;

          if (!offsetValue) {
            return new Response(undefined, { status: 401 });
          }

          const returnData = {
            totalSize: total > limit + parseInt(offsetValue) ? limit : 0,
            records: validUsers,
          };

          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, instanceUrl, offset })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: offset + limit,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, instanceUrl, offset: lastOffset })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({ accessToken: 'foo-bar', instanceUrl, offset })
      ).rejects.toBeInstanceOf(SalesforceError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.patch<{ userId: string }>(
          `${instanceUrl}/services/data/v60.0/sobjects/User/${userId}`,
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
        deleteUser({ accessToken: validToken, userId, instanceUrl })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validToken, userId, instanceUrl })
      ).resolves.toBeUndefined();
    });

    test('should throw SalesforceError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', userId, instanceUrl })
      ).rejects.toBeInstanceOf(SalesforceError);
    });
  });
});
