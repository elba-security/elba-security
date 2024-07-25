import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { LaunchdarklyError } from '../common/error';
import { type LaunchdarklyUser, getUsers, deleteUser } from './users';

const nextCursor = '/api/v2/members?offset=1';
const userId = 'test-id';
const apiKey = 'test-api-key';
const validUsers: LaunchdarklyUser[] = Array.from({ length: 2 }, (_, i) => ({
  _id: `${i}`,
  role: `admin`,
  firstName: `firstName-${i}`,
  lastName: `lastN_name-${i}`,
  email: `user-${i}@foo.bar`,
  mfa: 'disabled',
  _pendingInvite: false,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      const resolver: ResponseResolver = ({ request }) => {
        if (request.headers.get('Authorization') !== apiKey) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const after = url.searchParams.get('offset');
        const returnData = {
          items: validUsers,
          _links: after
            ? {
                next: {
                  href: nextCursor,
                },
              }
            : {},
        };

        return Response.json(returnData);
      };
      server.use(http.get(`${env.LAUNCHDARKLY_API_BASE_URL}/api/v2/members`, resolver));
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, nextLink: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          nextLink: nextCursor,
        })
      ).rejects.toBeInstanceOf(LaunchdarklyError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string; accountId: string }>(
          `${env.LAUNCHDARKLY_API_BASE_URL}/api/v2/members/:userId`,
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

    test('should throw LaunchdarklyError when token is invalid', async () => {
      await expect(deleteUser({ apiKey: 'invalidKey', userId })).rejects.toBeInstanceOf(
        LaunchdarklyError
      );
    });
  });
});
