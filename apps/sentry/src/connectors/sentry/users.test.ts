import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { SentryError } from '../common/error';
import type { SentryUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const endPage = '0:0:3';
const nextPage = '0:0:2';
const userId = 'test-user-id';
const organizationSlug = 'test-organization-slug';

const validUsers: SentryUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `first_name-${i}`,
  email: `user-${i}@foo.bar`,
  role: 'member',
  user: {
    isActive: true,
    has2fa: false,
  },
  pending: false,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.SENTRY_API_BASE_URL}/organizations/${organizationSlug}/members/`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            const url = new URL(request.url);
            const cursor = url.searchParams.get('cursor');

            const responseData = validUsers;
            const linkHeader =
              cursor === endPage
                ? `<${request.url}&cursor=100:1:0>; rel="next"; results="false"; cursor="100:1:0"`
                : `<${request.url}&cursor=100:1:0>; rel="next"; results="true"; cursor="100:1:0"`;

            return new Response(JSON.stringify(responseData), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                Link: linkHeader, // Add the link header here
              },
            });
          }
        )
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, cursor: nextPage, organizationSlug })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, cursor: endPage, organizationSlug })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', organizationSlug })).rejects.toBeInstanceOf(
        SentryError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.SENTRY_API_BASE_URL}/organizations/${organizationSlug}/members/${userId}/`,
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
        deleteUser({ accessToken: validToken, organizationSlug, userId })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validToken, organizationSlug, userId })
      ).resolves.toBeUndefined();
    });

    test('should throw SentryError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', organizationSlug, userId })
      ).rejects.toBeInstanceOf(SentryError);
    });
  });
});
