import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { GustoError } from '../common/error';
import type { GustoUser } from './users';
import { getUsers, deleteUser, getAuthUser } from './users';

const validToken = 'token-1234';
const endPage = 3;
const nextPage = 2;
const companyId = 'test-company-id';
const userId = 'test-user-id';

const validUsers: GustoUser[] = Array.from({ length: 5 }, (_, i) => ({
  email: `user-${i}@foo.bar`,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  terminated: false,
  uuid: `${i}`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.GUSTO_API_BASE_URL}/v1/companies/${companyId}/employees`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const responseData = validUsers;
          return new Response(
            JSON.stringify(responseData), // Body of the response
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'X-Total-Pages': `${endPage}`, // Add the mock header value for X-Total-Pages
              },
            }
          );
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: nextPage, companyId })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPage + 1,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: endPage, companyId })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({ accessToken: 'foo-bar', page: nextPage, companyId })
      ).rejects.toBeInstanceOf(GustoError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.post<{ userId: string }>(
          `${env.GUSTO_API_BASE_URL}/v1/employees/${userId}/terminations`,
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

    test('should throw GustoError when token is invalid', async () => {
      await expect(deleteUser({ accessToken: 'invalidToken', userId })).rejects.toBeInstanceOf(
        GustoError
      );
    });
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.GUSTO_API_BASE_URL}/v1/token_info`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const returnData = {
            resource: {
              uuid: companyId,
            },
          };

          return Response.json(returnData);
        })
      );
    });

    test('should return auth user id when the token is valid', async () => {
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({
        companyId,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getAuthUser('foo-bar')).rejects.toBeInstanceOf(GustoError);
    });
  });
});
