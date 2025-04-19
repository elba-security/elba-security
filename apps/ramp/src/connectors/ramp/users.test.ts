import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { RampError } from '../common/error';
import type { RampUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const endPageOffset = 'https://demo-api.ramp.com/developer/v1/users?page_size=2';
const nextPageUrl =
  'https://demo-api.ramp.com/developer/v1/users?page_size=2&start=01962487-9f30-79fd-9a74-4f5948618d93';
const userId = 'test-user-id';

const validUsers: RampUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  first_name: `firstName-${i}`,
  last_name: `lastName-${i}`,
  role: 'BUSINESS_ADMIN',
  email: `user-${i}@foo.bar`,
  status: 'USER_ACTIVE',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.RAMP_API_BASE_URL}/developer/v1/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const offset = url.searchParams.get('start');
          const responseData = {
            data: validUsers,
            page: {
              next: offset ? nextPageUrl : null,
            },
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ accessToken: validToken, page: nextPageUrl })).resolves.toStrictEqual(
        {
          validUsers,
          invalidUsers,
          nextPage: nextPageUrl,
        }
      );
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: endPageOffset })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(RampError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.patch<{ userId: string }>(
          `${env.RAMP_API_BASE_URL}/developer/v1/users/${userId}/deactivate`,
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

    test('should throw RampError when token is invalid', async () => {
      await expect(deleteUser({ accessToken: 'invalidToken', userId })).rejects.toBeInstanceOf(
        RampError
      );
    });
  });
});
