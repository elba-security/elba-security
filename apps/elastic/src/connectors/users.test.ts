/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/env';
import { type ElasticUser, getUsers, getAccountId, deleteUser } from './users';
import { ElasticError } from './commons/error';

const nextCursor = '1';
const userId = 'test-id';
const from = 1;
const apiKey = 'test-api-key';
const accountId = '2370721950';
const accounts = [{ id: accountId }];
const validUsers: ElasticUser[] = Array.from({ length: 2 }, (_, i) => ({
  user_id: `${i}`,
  name: `name-${i}`,
  role_assignments: {
    organization: [
      {
        role_id: 'organization-admin',
      },
    ],
  },
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      const resolver: ResponseResolver = ({ request }) => {
        if (request.headers.get('Authorization') !== `ApiKey ${apiKey}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const after = url.searchParams.get('from');
        let returnData;
        if (after) {
          returnData = {
            members: validUsers,
            from: 1,
          };
        } else {
          returnData = {
            members: validUsers,
          };
        }
        return Response.json(returnData);
      };
      server.use(
        http.get(`${env.ELASTIC_API_BASE_URL}organizations/${accountId}/members`, resolver)
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, accountId, afterToken: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: (from + 1).toString(),
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey, accountId, afterToken: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          accountId,
          afterToken: nextCursor,
        })
      ).rejects.toBeInstanceOf(ElasticError);
    });
  });

  describe('getAccountId', () => {
    beforeEach(() => {
      const resolver: ResponseResolver = ({ request }) => {
        if (request.headers.get('Authorization') !== `ApiKey ${apiKey}`) {
          return new Response(undefined, { status: 401 });
        }

        return Response.json({ organizations: accounts });
      };
      server.use(http.get(`${env.ELASTIC_API_BASE_URL}organizations`, resolver));
    });

    test('should return accounts when the apiKey is valid', async () => {
      await expect(getAccountId({ apiKey })).resolves.toStrictEqual({
        accountId,
      });
    });

    test('should throws when the apiKey is invalid', async () => {
      await expect(
        getAccountId({
          apiKey: 'foo-id',
        })
      ).rejects.toBeInstanceOf(ElasticError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string; accountId: string }>(
          `${env.ELASTIC_API_BASE_URL}organizations/:accountId/members/:userId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `ApiKey ${apiKey}`) {
              return new Response(undefined, { status: 401 });
            }
            if (params.accountId !== accountId) {
              return new Response(undefined, { status: 401 });
            }
            if (params.userId !== userId) {
              // Return a JSON response with an appropriate error structure
              return new Response(
                JSON.stringify({
                  errors: [
                    { code: 'organization.membership_not_found', message: 'Membership not found' },
                  ],
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              );
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when apiKey is valid', async () => {
      await expect(deleteUser({ apiKey, userId, accountId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ apiKey, userId: 'invalid-user1-id', accountId })
      ).resolves.toBeUndefined();
    });

    test('should throw ElasticError when the accountId is invalid', async () => {
      await expect(
        deleteUser({ apiKey, userId, accountId: 'invalid-account-id' })
      ).rejects.toBeInstanceOf(ElasticError);
    });

    test('should throw ElasticError when token is invalid', async () => {
      await expect(deleteUser({ apiKey: 'invalidKey', userId, accountId })).rejects.toBeInstanceOf(
        ElasticError
      );
    });
  });
});
