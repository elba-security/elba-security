import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';
import { type SegmentUser, getUsers, deleteUser } from './users';

const nextCursor = 'next-cursor';
const accessToken = 'test-api-key';
const userId = 'test-user-id';
const validUsers: SegmentUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `${i}`,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.SEGMENT_API_BASE_URL}/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const cursor = url.searchParams.get('pagination.cursor');
          const returnData = cursor
            ? {
                data: {
                  users: validUsers,
                  pagination: {
                    next: nextCursor,
                  },
                },
              }
            : {
                data: {
                  users: validUsers,
                  pagination: {},
                },
              };
          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ accessToken, cursor: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ accessToken, cursor: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({
          accessToken: 'foo-id',
          cursor: nextCursor,
        })
      ).rejects.toBeInstanceOf(IntegrationConnectionError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string; token: string }>(
          `${env.SEGMENT_API_BASE_URL}/users`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
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

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ accessToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ accessToken, userId: 'invalid-user-id' })).resolves.toBeUndefined();
    });

    test('should throw IntegrationConnectionError when token is invalid', async () => {
      await expect(deleteUser({ accessToken: 'invalidKey', userId })).rejects.toBeInstanceOf(
        IntegrationConnectionError
      );
    });
  });
});
