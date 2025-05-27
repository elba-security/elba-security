import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { SalesforceError } from '../common/error';
import type { SalesforceUser } from './users';
import { getUsers, getAuthUser } from './users';

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
  UserType: 'Standard',
  Profile: { Id: `role-id-${i}`, Name: `role-name-${i}` },
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      const apiUrl = `${instanceUrl}/services/data/v60.0/query`;

      server.use(
        http.get(apiUrl, ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          if (authHeader !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const requestUrl = new URL(request.url);
          const queryParam = requestUrl.searchParams.get('q');
          const offsetMatch = queryParam ? /OFFSET\s+(?<offsetValue>\d+)/i.exec(queryParam) : null;

          const offsetValue = offsetMatch
            ? parseInt(offsetMatch.groups?.offsetValue || '0', 10)
            : null;

          if (offsetValue === null) {
            return new Response(undefined, { status: 401 });
          }

          const returnData = {
            totalSize: total > limit + offsetValue ? limit : total - offsetValue,
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

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get<{ userId: string }>(`${instanceUrl}/services/oauth2/userinfo`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            user_id: userId,
            active: true,
          });
        })
      );
    });

    test('should return current user info', async () => {
      await expect(getAuthUser({ accessToken: validToken, instanceUrl })).resolves.toStrictEqual({
        userId,
      });
    });

    test('should throw SalesforceError when token is invalid', async () => {
      await expect(
        getAuthUser({ accessToken: 'invalidToken', instanceUrl })
      ).rejects.toBeInstanceOf(SalesforceError);
    });
  });
});
