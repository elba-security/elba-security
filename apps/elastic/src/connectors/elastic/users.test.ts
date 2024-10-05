/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { ElasticError } from './common/error';
import { type ElasticUser, getUsers, deleteUser } from './users';

const nextCursor = '1';
const userId = 'test-id';
const from = 1;
const apiKey = 'test-api-key';
const accountId = '2370721950';
const validUsers: ElasticUser[] = Array.from({ length: 2 }, (_, i) => ({
  user_id: `${i}`,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get<{ accountId: string }>(
          `https://api.elastic-cloud.com/api/v1/organizations/:accountId/members`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `ApiKey ${apiKey}`) {
              return new Response(undefined, { status: 401 });
            }

            if (params.accountId !== accountId) {
              return new Response(undefined, { status: 404 });
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
          }
        )
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

    test('should throws when the given account does not exist', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          accountId: 'fake account id',
          afterToken: nextCursor,
        })
      ).rejects.toBeInstanceOf(ElasticError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string; accountId: string }>(
          `https://api.elastic-cloud.com/api/v1/organizations/:accountId/members/:userId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `ApiKey ${apiKey}`) {
              return new Response(undefined, { status: 401 });
            }
            if (params.accountId !== accountId) {
              return new Response(undefined, { status: 404 });
            }
            if (params.userId !== userId) {
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
